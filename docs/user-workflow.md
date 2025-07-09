# ユーザーワークフロー

## ジョブ作成から実行までの流れ

### 1. ジョブ作成手順

#### Step 1: 新規ジョブ作成画面
1. **ジョブ名入力**
   - ユニークなジョブ名を指定
   - 例: `beam_analysis_001`

2. **実行ノード選択** ⭐重要⭐
   - 利用可能なノードの一覧から選択
   - 各ノードのCPUとライセンストークン使用状況を表示
   - ノード情報例:
     ```
     Node-01 (利用可能) 🟢
     CPU: 6/16コア使用中, ライセンス: 6/16トークン
     
     Node-02 (高負荷) 🟠  
     CPU: 28/32コア使用中, ライセンス: 18/20トークン
     
     Node-03 (利用不可) 🔴
     メンテナンス中
     ```

3. **CPU数選択** ⭐重要⭐
   - 解析規模に応じてCPU数を選択
   - ライセンストークン数は自動的に計算（非線形関数）
   - 選択肢:
     ```
     ○ 2コア (2ライセンストークン) - 軽量解析・テスト用
     ○ 4コア (5ライセンストークン) - 中規模解析
     ○ 8コア (12ライセンストークン) - 大規模解析
     ```
   - 選択したノードでリソースが不足の場合は警告表示
   - ライセンストークン数はCPU数選択時に自動表示

4. **INPファイルアップロード**
   - ドラッグ&ドロップまたはファイル選択
   - ファイル検証（拡張子: .inp, サイズ制限）
   - アップロード進捗表示

5. **優先度設定（オプション）**
   - デフォルト: 0（通常）
   - 高優先度: 1-5
   - 緊急: 10

6. **ジョブ作成実行**
   - 入力内容とリソース要求の確認
   - リソース利用可能性の最終チェック
   - データベースへの保存
   - ステータス: `Waiting`

### 2. ジョブ実行の流れ

#### 自動スケジューリング
```
[ユーザーがジョブ作成]
        ↓
   Status: Waiting
        ↓
[スケジューラーがチェック] ← 5秒間隔
        ↓
指定ノードでリソース利用可能？
(CPU + ライセンストークン)
    Yes ↓         No ↓
Status: Starting   待機継続
        ↓
[SSH接続・ファイル転送]
        ↓
   Status: Running
        ↓
[Abaqus実行・監視]
        ↓
Status: Completed/Failed
```

#### ユーザー視点での状態確認
- **リアルタイム更新**: SSEによる自動更新
- **詳細情報**: ジョブをクリックで詳細表示
- **進捗メッセージ**: 実行ステップの表示

### 3. ノード選択の指針

#### ノード選択時の考慮事項
1. **現在の負荷状況**
   - 実行中ジョブ数 / 最大同時実行数
   - 待機中ジョブ数

2. **ノードの性能特性**
   - CPUコア数
   - メモリ容量
   - 過去の実行時間実績

3. **ノードの利用可能性**
   - 現在のステータス
   - メンテナンス予定

#### 推奨ノード選択パターン

**軽量ジョブ（短時間実行予想）**
```
→ 現在の負荷が軽いノードを選択
→ 待機時間を最小化
```

**重量ジョブ（長時間実行予想）**
```
→ 高性能ノードを選択
→ 他ユーザーへの影響を考慮
```

**緊急ジョブ**
```
→ 利用可能な任意のノードを選択
→ 優先度を高く設定
```

### 4. UI/UX仕様

#### ジョブ作成画面（英語UI）
```
┌─ Create New Job ─────────────────────────┐
│                                          │
│ Job Name: [________________]             │
│                                          │
│ Execution Node:                          │
│ ○ Node-01 🟢 Available                   │
│   CPU: 6/16 cores, License: 6/16 tokens │
│ ○ Node-02 🟠 High Load                   │
│   CPU: 28/32 cores, License: 18/20 tokens│
│ ○ Node-03 🔴 Unavailable                 │
│   Under maintenance                      │
│                                          │
│ CPU Cores:                               │
│ ○ 2 cores (2 license tokens) - Light    │
│ ○ 4 cores (5 license tokens) - Medium   │
│ ○ 8 cores (12 license tokens) - Heavy   │
│                                          │
│ INP File:                                │
│ ┌─────────────────────────────────────┐  │
│ │   📎 Drag & drop or click to select │  │
│ │      INP file                       │  │
│ └─────────────────────────────────────┘  │
│                                          │
│ Priority: [0_____5_____10] Normal        │
│                                          │
│          [Cancel] [Create Job]           │
└──────────────────────────────────────────┘
```

#### ジョブ一覧画面（英語UI）
```
┌─ Abaqus Job Manager ─────────────────────┐
│                                          │
│ [New Job] [Refresh] [Settings]           │
│                                          │
│ ┌────────────────────────────────────────┐ │
│ │ID │Job Name   │Status   │Node   │CPU│Lic│ │
│ ├────────────────────────────────────────┤ │
│ │1  │beam_001   │🔄Running│Node-01│4  │5  │ │
│ │2  │shell_002  │⏳Waiting│Node-02│8  │12 │ │
│ │3  │contact_003│✅Complete│Node-01│2  │2  │ │
│ └────────────────────────────────────────┘ │
│                                          │
│ System License Usage: 19/50 tokens (38%) │
│                                          │
└──────────────────────────────────────────┘
```

### 5. エラーハンドリング（英語メッセージ）

#### ユーザーが遭遇する可能性のあるエラー

**ファイルアップロードエラー**
- 原因: ファイルサイズ制限超過、不正な拡張子
- 英語メッセージ例:
  - "File size exceeds the maximum limit of 100MB"
  - "Only .inp files are allowed"
  - "Please select a valid INP file"

**リソース不足エラー**
- 原因: CPU・ライセンストークン不足
- 英語メッセージ例:
  - "Insufficient CPU cores available on selected node"
  - "Not enough license tokens available (Required: 12, Available: 8)"
  - "System license limit exceeded. Please try again later"

**ノード選択エラー**
- 原因: 選択ノードが利用不可になった
- 英語メッセージ例:
  - "Selected node is no longer available"
  - "Node is under maintenance. Please select another node"

**ジョブ実行エラー**
- 原因: SSH接続失敗、Abaqus実行エラー
- 英語メッセージ例:
  - "Failed to connect to execution node"
  - "Abaqus execution error occurred"
  - "Job failed during processing. Check logs for details"

### 6. 運用上の注意点

#### ユーザー向けガイドライン

**効率的なノード利用**
- 軽量ジョブは負荷の軽いノードを選択
- 長時間ジョブは他ユーザーとの調整を推奨
- 緊急時以外は優先度設定を控える

**ファイル管理**
- INPファイル名は分かりやすく命名
- 不要になったジョブは定期的に削除
- 結果ファイルのダウンロード・バックアップ

**トラブル時の対応**
- ジョブが長時間 "Starting" の場合は管理者に連絡
- エラーメッセージを記録して報告
- 緊急時は管理者による手動介入を要請