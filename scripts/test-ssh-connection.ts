#!/usr/bin/env bun
/**
 * SSH Connection Test Script
 * 
 * 手動でSSH接続をテストするためのスクリプト
 * 
 * 使用方法:
 * bun run scripts/test-ssh-connection.ts --host hostname --user username [options]
 * 
 * オプション:
 * --host, -h: 接続先ホスト名 (必須)
 * --user, -u: ユーザー名 (必須)
 * --port, -p: ポート番号 (デフォルト: 22)
 * --timeout, -t: タイムアウト (デフォルト: 30000ms)
 * --abaqus, -a: Abaqusテストを実行
 * --verbose, -v: 詳細出力
 * 
 * 例:
 * bun run scripts/test-ssh-connection.ts -h 192.168.1.100 -u abaqus -p 22 --abaqus --verbose
 */

import { testNodeConnection, type NodeConfig, type HealthCheckConfig } from '../app/lib/nodeHealthCheck';
import { parseArgs } from 'util';

interface CLIArgs {
  host?: string;
  user?: string;
  port?: string;
  timeout?: string;
  abaqus?: boolean;
  verbose?: boolean;
  help?: boolean;
}

function showHelp() {
  console.log(`
SSH Connection Test Script

Usage: bun run scripts/test-ssh-connection.ts --host hostname --user username [options]

Options:
  --host, -h      Target hostname (required)
  --user, -u      Username (required)
  --port, -p      Port number (default: 22)
  --timeout, -t   Timeout in milliseconds (default: 30000)
  --abaqus, -a    Test Abaqus environment
  --verbose, -v   Verbose output
  --help          Show this help

Examples:
  bun run scripts/test-ssh-connection.ts -h 192.168.1.100 -u abaqus
  bun run scripts/test-ssh-connection.ts -h server.local -u testuser -p 2222 --abaqus
  bun run scripts/test-ssh-connection.ts -h 10.0.0.5 -u admin --timeout 60000 -v
`);
}

async function main() {
  const { values: args } = parseArgs({
    args: process.argv.slice(2),
    options: {
      host: { type: 'string', short: 'h' },
      user: { type: 'string', short: 'u' },
      port: { type: 'string', short: 'p' },
      timeout: { type: 'string', short: 't' },
      abaqus: { type: 'boolean', short: 'a' },
      verbose: { type: 'boolean', short: 'v' },
      help: { type: 'boolean' }
    }
  }) as { values: CLIArgs };

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (!args.host || !args.user) {
    console.error('❌ Error: --host and --user are required');
    showHelp();
    process.exit(1);
  }

  const nodeConfig: NodeConfig = {
    hostname: args.host,
    ssh_port: parseInt(args.port || '22'),
    username: args.user
  };

  const healthConfig: HealthCheckConfig = {
    testAbaqus: args.abaqus || false,
    timeout: parseInt(args.timeout || '30000')
  };

  console.log('🚀 Starting SSH connection test...\n');
  
  if (args.verbose) {
    console.log('📋 Configuration:');
    console.log(`   Host: ${nodeConfig.hostname}`);
    console.log(`   Port: ${nodeConfig.ssh_port}`);
    console.log(`   User: ${nodeConfig.username}`);
    console.log(`   Timeout: ${healthConfig.timeout}ms`);
    console.log(`   Test Abaqus: ${healthConfig.testAbaqus ? 'Yes' : 'No'}`);
    console.log('');
  }

  const startTime = Date.now();
  
  try {
    console.log(`🔗 Connecting to ${nodeConfig.username}@${nodeConfig.hostname}:${nodeConfig.ssh_port}...`);
    
    const result = await testNodeConnection(nodeConfig, healthConfig);
    const totalTime = Date.now() - startTime;
    
    console.log('\n📊 Test Results:');
    console.log('================');
    
    if (result.success) {
      console.log('✅ Overall Status: SUCCESS');
    } else {
      console.log('❌ Overall Status: FAILED');
    }
    
    console.log(`⏱️  Total Time: ${totalTime}ms`);
    console.log(`🔗 Connection Time: ${result.connectionTime}ms`);
    console.log(`🖥️  Remote Hostname: ${result.hostname}`);
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    }
    
    console.log('\n🔍 Test Details:');
    console.log('================');
    
    // SSH Connection Test
    console.log(`SSH Connection: ${result.tests.sshConnection.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (result.tests.sshConnection.error) {
      console.log(`  Error: ${result.tests.sshConnection.error}`);
    }
    
    // Basic Commands Test
    if (result.tests.basicCommands) {
      console.log(`Basic Commands: ${result.tests.basicCommands.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      if (args.verbose && result.tests.basicCommands.commands) {
        console.log(`  Executed: ${result.tests.basicCommands.commands.join(', ')}`);
      }
      if (result.tests.basicCommands.error) {
        console.log(`  Error: ${result.tests.basicCommands.error}`);
      }
    }
    
    // Abaqus Environment Test
    if (result.tests.abaqusEnvironment) {
      console.log(`Abaqus Environment: ${result.tests.abaqusEnvironment.success ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
      if (result.tests.abaqusEnvironment.version) {
        console.log(`  Version: ${result.tests.abaqusEnvironment.version}`);
      }
      if (result.tests.abaqusEnvironment.error) {
        console.log(`  Error: ${result.tests.abaqusEnvironment.error}`);
      }
    }
    
    console.log('\n🎉 Test completed successfully!');
    process.exit(0);
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.log(`\n❌ Test failed after ${totalTime}ms:`);
    console.error(error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});