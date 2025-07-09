# API仕様書

## 概要

Abaqus Job Manager のREST API及びSSE API仕様

## REST API

### Base URL
```
/api/v1
```

### 認証
- 現在はユーザー識別のみ（パスワード認証なし）
- ヘッダー: `X-User-ID: {userId}`

---

## Jobs API

### GET /jobs
ジョブ一覧を取得

#### Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| status | string | No | ステータスフィルター |
| user | string | No | ユーザーフィルター |
| node | string | No | ノードフィルター |
| limit | number | No | 取得件数制限（デフォルト: 50） |
| offset | number | No | オフセット（デフォルト: 0） |

#### Response
```json
{
  "jobs": [
    {
      "id": 1,
      "name": "simulation_001",
      "status": "Running",
      "user_id": "student01",
      "node_id": "node-01",
      "message": "Processing step 2/5",
      "execution_path": "/abaqus/jobs/simulation_001",
      "result_path": "/abaqus/results/simulation_001",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T11:15:00Z",
      "priority": 0
    }
  ],
  "total": 25,
  "limit": 50,
  "offset": 0
}
```

### GET /jobs/:id
特定ジョブの詳細を取得

#### Response
```json
{
  "id": 1,
  "name": "simulation_001",
  "status": "Running",
  "user_id": "student01",
  "node_id": "node-01",
  "message": "Processing step 2/5",
  "execution_path": "/abaqus/jobs/simulation_001",
  "result_path": "/abaqus/results/simulation_001",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T11:15:00Z",
  "priority": 0,
  "files": [
    {
      "type": "sta",
      "path": "/abaqus/jobs/simulation_001/simulation_001.sta",
      "size": 1024,
      "updated_at": "2024-01-15T11:15:00Z"
    },
    {
      "type": "log",
      "path": "/abaqus/jobs/simulation_001/simulation_001.log",
      "size": 2048,
      "updated_at": "2024-01-15T11:14:30Z"
    }
  ]
}
```

### POST /jobs
新規ジョブを作成

#### Request Body
```json
{
  "name": "simulation_002",
  "input_file": "/path/to/input.inp",
  "user_id": "student01",
  "priority": 0
}
```

#### Response
```json
{
  "id": 2,
  "name": "simulation_002",
  "status": "Waiting",
  "user_id": "student01",
  "created_at": "2024-01-15T12:00:00Z"
}
```

### PUT /jobs/:id
ジョブ情報を更新

#### Request Body
```json
{
  "priority": 1,
  "status": "Cancelled"
}
```

#### Response
```json
{
  "id": 1,
  "message": "Job updated successfully"
}
```

### DELETE /jobs/:id
ジョブを削除

#### Response
```json
{
  "id": 1,
  "message": "Job deleted successfully"
}
```

---

## Job Files API

### GET /jobs/:id/files/:type
ジョブの実行ファイル内容を取得

#### Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| type | string | Yes | ファイルタイプ (sta/dat/log/msg) |

#### Response
```
Content-Type: text/plain

# Abaqus ファイルの内容
ABAQUS/Standard 2023
Job simulation_001 started at 10:30:00
...
```

### GET /jobs/:id/files/:type/download
ジョブファイルをダウンロード

#### Response
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="simulation_001.sta"

[ファイルバイナリデータ]
```

---

## Nodes API

### GET /nodes
利用可能なノード一覧を取得

#### Response
```json
{
  "nodes": [
    {
      "id": "node-01",
      "hostname": "abaqus-node-01.local",
      "ssh_host": "192.168.1.100",
      "ssh_port": 22,
      "ssh_user": "abaqus",
      "status": "Available",
      "max_concurrent": 2,
      "current_jobs": 1,
      "created_at": "2024-01-10T09:00:00Z"
    }
  ]
}
```

### POST /nodes
新規ノードを追加

#### Request Body
```json
{
  "id": "node-02",
  "hostname": "abaqus-node-02.local",
  "ssh_host": "192.168.1.101",
  "ssh_user": "abaqus",
  "max_concurrent": 1
}
```

---

## Users API

### GET /users
ユーザー一覧を取得

#### Response
```json
{
  "users": [
    {
      "id": "student01",
      "name": "田中太郎",
      "role": "student",
      "created_at": "2024-01-05T00:00:00Z"
    },
    {
      "id": "prof01",
      "name": "山田教授",
      "role": "faculty",
      "created_at": "2024-01-05T00:00:00Z"
    }
  ]
}
```

### POST /users
新規ユーザーを追加

#### Request Body
```json
{
  "id": "student02",
  "name": "佐藤花子",
  "role": "student"
}
```

---

## SSE API

### 接続
```
ws://localhost:3000/ws
```

### 認証
接続時にクエリパラメータでユーザーIDを指定
```
ws://localhost:3000/ws?user_id=student01
```

### イベント種別

#### job:status
ジョブステータス更新通知
```json
{
  "event": "job:status",
  "data": {
    "job_id": 1,
    "status": "Running",
    "message": "Processing step 3/5",
    "updated_at": "2024-01-15T11:20:00Z"
  }
}
```

#### job:created
新規ジョブ作成通知
```json
{
  "event": "job:created",
  "data": {
    "id": 3,
    "name": "simulation_003",
    "user_id": "student02",
    "status": "Waiting",
    "created_at": "2024-01-15T12:30:00Z"
  }
}
```

#### job:completed
ジョブ完了通知
```json
{
  "event": "job:completed",
  "data": {
    "job_id": 1,
    "status": "Completed",
    "execution_time": 3600,
    "result_path": "/abaqus/results/simulation_001",
    "completed_at": "2024-01-15T12:00:00Z"
  }
}
```

#### job:failed
ジョブ失敗通知
```json
{
  "event": "job:failed",
  "data": {
    "job_id": 2,
    "status": "Failed",
    "error_message": "Input file validation failed",
    "failed_at": "2024-01-15T11:45:00Z"
  }
}
```

#### node:status
ノードステータス更新通知
```json
{
  "event": "node:status",
  "data": {
    "node_id": "node-01",
    "status": "Busy",
    "current_jobs": 2,
    "updated_at": "2024-01-15T11:30:00Z"
  }
}
```

## エラーレスポンス

### 共通エラー形式
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "field": "name",
      "reason": "Name is required"
    }
  }
}
```

### エラーコード一覧

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | リクエストパラメータ検証エラー |
| UNAUTHORIZED | 401 | 認証エラー |
| FORBIDDEN | 403 | 権限エラー |
| NOT_FOUND | 404 | リソースが見つからない |
| CONFLICT | 409 | リソース競合エラー |
| INTERNAL_ERROR | 500 | サーバー内部エラー |
| SERVICE_UNAVAILABLE | 503 | サービス利用不可 |

## レート制限

- API呼び出し: 100回/分/ユーザー
- SSE接続: 10接続/ユーザー
- ファイルダウンロード: 50MB/分/ユーザー