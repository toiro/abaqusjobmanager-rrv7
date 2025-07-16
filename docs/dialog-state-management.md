# ダイアログ状態管理システム

Abaqus Job Managerにおけるダイアログコンポーネントの状態管理とauto-close制御の仕組みについて説明します。

## 概要

React Router v7のactionData永続化により、フォーム送信後の成功状態が残り続ける問題を解決するため、フォーム送信タイミングを正確に追跡するシステムを実装しています。

## 問題背景

### 従来の問題点
1. **actionData永続化**: React Router v7では、action実行後のactionDataが次のnavigationまで残り続ける
2. **意図しない自動クローズ**: ダイアログを再度開いた際、前回の成功状態により即座に閉じてしまう
3. **複数アクション干渉**: 同一ページ内の異なるアクション（Activate/Deactivate等）の成功状態が他のダイアログに影響

### 具体的なケース
```
1. Edit User ダイアログでSave Changes
2. actionData = { success: true, intent: "edit-user" }
3. ダイアログが閉じる
4. 再度Edit Userボタンクリック
5. ダイアログが開く → 即座に閉じる（前回のactionDataが残存）
6. Activate/Deactivateボタンクリック
7. 再度Edit Userボタンクリック → 正常動作（actionDataが更新）
```

## 解決策

### 1. Intent（アクション種別）による制御

各actionで対応するintentを返すことで、ダイアログが関連するアクションでのみ反応するよう制御。

```typescript
// Route action例
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "edit-user") {
    // ... ユーザー更新処理
    return { success: "User updated successfully", intent: "edit-user" };
  }
  
  if (intent === "toggle-active") {
    // ... ステータス切り替え処理  
    return { success: "Status updated", intent: "toggle-active" };
  }
}
```

### 2. フォーム送信タイミング追跡

`useRef`を使用してフォーム送信のタイミングを正確に追跡し、実際の送信後のみ自動クローズを許可。

```typescript
// BaseDialog内の実装
const formSubmittedRef = useRef(false);

// ダイアログ開時にリセット
useEffect(() => {
  if (isOpen) {
    formSubmittedRef.current = false;
  }
}, [isOpen]);

// フォーム送信時にフラグ設定
const handleFormSubmit = () => {
  formSubmittedRef.current = true;
};

// 条件付き自動クローズ
useEffect(() => {
  if (!disableAutoClose && isOpen && actionData?.success && 
      actionData?.intent === config.intent && formSubmittedRef.current) {
    onClose();
  }
}, [disableAutoClose, isOpen, actionData, config.intent, onClose]);
```

## 動作フロー

### 正常なフォーム送信フロー
```
1. ダイアログ開く
   └─ formSubmittedRef.current = false

2. フォーム入力・送信
   └─ handleFormSubmit() → formSubmittedRef.current = true

3. Action実行・成功
   └─ actionData = { success: true, intent: "edit-user" }

4. 自動クローズ条件チェック
   ├─ isOpen: true ✓
   ├─ actionData.success: true ✓  
   ├─ actionData.intent === config.intent: true ✓
   └─ formSubmittedRef.current: true ✓
   → ダイアログクローズ

5. 再度ダイアログ開く
   └─ formSubmittedRef.current = false（リセット）
   → 前回のactionDataが残っていても閉じない
```

### 他のアクション実行後のフロー
```
1. Activate/Deactivateボタンクリック
   └─ actionData = { success: true, intent: "toggle-active" }

2. Edit Userダイアログ開く  
   ├─ formSubmittedRef.current = false
   ├─ actionData.intent ("toggle-active") ≠ config.intent ("edit-user")
   └─ 自動クローズしない（意図通り）
```

## 実装パターン

### 1. BaseDialogパターン（推奨）

NodeModalとUserModalで採用。統一された実装で一貫性を保つ。

```typescript
<BaseDialog
  isOpen={isOpen}
  onClose={onClose}
  config={{
    title: "Edit User",
    intent: "edit-user",
    submitText: "Save Changes"
  }}
  isFormValid={isFormValid}
  actionData={actionData}
>
  {/* フォーム内容 */}
</BaseDialog>
```

**特徴:**
- フォーム送信追跡が内蔵
- Intent制御が自動
- コード重複なし

### 2. 個別実装パターン

JobModal、DeleteDialog系で採用。特殊な要件がある場合に使用。

```typescript
// useJobFormでの実装例
useEffect(() => {
  if (actionData?.error || (actionData && !actionData.success)) {
    setFormError(actionData?.error || actionData?.message || 'An error occurred');
  } else if (isModalOpen && actionData?.success && onClose) {
    if (actionData?.intent?.includes('job')) {
      onClose();
    }
  }
}, [isModalOpen, actionData, onClose]);
```

**特徴:**
- カスタムロジック対応
- 複雑な条件制御可能
- ただし実装が分散

### 3. シンプルパターン

DeleteDialog系で採用。フォーム送信追跡なしの基本制御。

```typescript
useEffect(() => {
  if (isOpen && actionData?.success && actionData?.intent === "delete-user") {
    onClose();
  }
}, [isOpen, actionData, onClose]);
```

**特徴:**
- 最小限の実装
- Deleteアクションに適している
- 再開問題は発生しにくい

## 適用ガイドライン

### BaseDialogを使用すべき場合
- 標準的なCreate/Edit操作
- 複数フィールドのフォーム
- 再利用性を重視する場合

### 個別実装を使用すべき場合  
- ファイルアップロード機能
- 複雑なカスタムバリデーション
- 特殊なUI要件がある場合

### シンプルパターンを使用すべき場合
- 確認ダイアログ（Delete等）
- 最小限のフォーム
- 単一アクションのみ

## 注意点とベストプラクティス

### 注意点
1. **intent命名**: 一意で明確な命名を使用（例：`create-user`, `edit-node`, `delete-job`）
2. **ActionData型整合性**: 全てのactionでintentフィールドを含める
3. **エラーハンドリング**: エラー時もintentを含めることを忘れずに

### ベストプラクティス
1. **一貫性**: 同じ操作タイプには同じパターンを適用
2. **型安全性**: actionData型定義にintentを含める
3. **テスト**: フォーム送信→成功→再開の一連フローをテスト

## トラブルシューティング

### よくある問題

**Q: ダイアログが開かない**
```
A: formSubmittedRef.currentがtrueのまま残っている可能性
   → ダイアログ開時のリセット処理を確認
```

**Q: 意図しないダイアログクローズ**  
```
A: intent不一致または他のアクションのactionDataが影響
   → intentの命名とマッチング条件を確認
```

**Q: エラー後にダイアログが閉じる**
```
A: エラー時のintent設定漏れ
   → エラーレスポンスにもintentを含める
```

## 関連ファイル

- `/app/app/components/shared/BaseDialog.tsx` - 基本実装
- `/app/app/components/users/UserModal.tsx` - BaseDialog使用例
- `/app/app/components/nodes/NodeModal.tsx` - BaseDialog使用例  
- `/app/app/components/jobs/shared/useJobForm.ts` - 個別実装例
- `/app/app/routes/admin.users.tsx` - Action実装例
- `/app/app/routes/admin.nodes.tsx` - Action実装例

---

*このドキュメントは、React Router v7でのactionData永続化問題に対する包括的な解決策を提供します。新しいダイアログ実装時は、この仕組みに従って一貫した実装を行ってください。*