# ダイアログシステム利用ガイド

## 概要

ダイアログシステムは、HTML `<dialog>` 要素を使用した軽量でブラウザネイティブなダイアログ実装を提供します。React Router v7アプリケーション向けに設計されており、完全なTypeScriptサポートと自動フォーム統合機能を備えています。

## 主要機能

### ブラウザネイティブのメリット
- **自動フォーカス管理** - ブラウザが自動的にフォーカストラップを処理
- **組み込みESCキー対応** - カスタムJavaScriptなしでネイティブESCキーサポート
- **ネイティブバックドロップ動作** - 外側クリックで閉じる機能が標準装備
- **スクリーンリーダー対応** - 組み込まれた完全なアクセシビリティサポート
- **モバイルフレンドリー** - ネイティブモバイルダイアログ動作

### 実装上のメリット
- **Context Provider不要** - シンプルなフックベースAPI
- **軽量アーキテクチャ** - 最小限のバンドルサイズ影響
- **ダイアログオープン時の状態リセット** - クリーンな状態管理
- **React Router統合** - シームレスなフォーム送信処理
- **TypeScript完全対応** - 完全な型安全性

## コンポーネント

### Dialog
シンプルなコンテンツ表示用の基本ダイアログコンポーネント。

```typescript
interface DialogProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
  className?: string;
  resetKey?: number;
}
```

### FormDialog
React Router統合と自動送信処理を備えたフォーム専用ダイアログ。

```typescript
interface FormDialogProps extends Omit<DialogProps, "children"> {
  children: ReactNode;
  intent: string;
  encType?: "multipart/form-data" | "application/x-www-form-urlencoded";
  submitText: string;
  cancelText?: string;
  isFormValid?: boolean;
  isSubmitting?: boolean;
  hiddenFields?: Record<string, string | number>;
}
```

## フック

### useDialog()
基本ダイアログ用のシンプルなダイアログ状態管理。

```typescript
interface UseDialogReturn {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  toggleDialog: () => void;
  resetKey: number;
}
```

**機能:**
- `resetKey`によるダイアログオープン時の状態リセット
- クリーンなオープン・クローズ機能
- 外部依存関係なし

### useDialogWithAction()
React Router actionData統合と自動クローズ機能を備えた拡張ダイアログフック。

```typescript
interface UseDialogWithActionReturn extends UseDialogReturn {
  actionData?: ActionData;
  lastAction: string;
}
```

**機能:**
- フォーム送信成功時の自動ダイアログクローズ
- アクションデータの追跡と表示
- アクションの重複処理防止
- 状態リセット機能

## 使用パターン

### シンプルダイアログ
基本的なコンテンツ表示、確認、情報パネル用。

```typescript
import { Dialog, useDialog } from "~/client/components/dialog";

export default function MyComponent() {
  const dialog = useDialog();

  return (
    <>
      <Button onClick={dialog.openDialog}>
        Open Dialog
      </Button>

      <Dialog
        isOpen={dialog.isOpen}
        title="Simple Dialog"
        onClose={dialog.closeDialog}
        resetKey={dialog.resetKey}
      >
        <p>Dialog content goes here.</p>
        <div className="flex justify-end">
          <Button onClick={dialog.closeDialog}>
            Close
          </Button>
        </div>
      </Dialog>
    </>
  );
}
```

### フォームダイアログ
自動クローズとアクション統合を備えたフォーム送信用。

```typescript
import { FormDialog, useDialogWithAction } from "~/client/components/dialog";

export default function MyComponent() {
  const dialog = useDialogWithAction();

  return (
    <>
      <Button onClick={dialog.openDialog}>
        Create User
      </Button>

      {/* Action feedback display */}
      {dialog.lastAction && (
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-green-800">{dialog.lastAction}</p>
        </div>
      )}

      <FormDialog
        isOpen={dialog.isOpen}
        title="Create New User"
        onClose={dialog.closeDialog}
        intent="create-user"
        submitText="Create User"
        resetKey={dialog.resetKey}
      >
        <div className="space-y-4">
          <input name="name" placeholder="User name" required />
          <input name="email" type="email" placeholder="Email" required />
        </div>
      </FormDialog>
    </>
  );
}
```

### 確認ダイアログ
ユーザー確認が必要な破壊的アクション用。

```typescript
import { Dialog, useDialog } from "~/client/components/dialog";

export default function MyComponent() {
  const confirmDialog = useDialog();

  const handleConfirm = () => {
    // Perform destructive action
    console.log("Action confirmed!");
    confirmDialog.closeDialog();
  };

  return (
    <>
      <Button 
        variant="destructive" 
        onClick={confirmDialog.openDialog}
      >
        Delete Item
      </Button>

      <Dialog
        isOpen={confirmDialog.isOpen}
        title="Confirm Deletion"
        onClose={confirmDialog.closeDialog}
        resetKey={confirmDialog.resetKey}
      >
        <div className="space-y-4">
          <p>Are you sure you want to delete this item?</p>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <strong>Warning:</strong> This action cannot be undone.
          </div>
          
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={confirmDialog.closeDialog}
              className="mt-3 sm:mt-0"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
            >
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
```

## React Router統合

### アクションハンドラー
FormDialogコンポーネント用にルートでアクションハンドラーを実装：

```typescript
// In your route file (e.g., app/routes/users.tsx)
export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create-user") {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    // Perform your business logic
    await createUser({ name, email });

    // Return success response for dialog auto-close
    return {
      success: true,
      intent,
      message: `User ${name} created successfully`,
    };
  }

  return { success: false, intent, error: "Invalid intent" };
}
```

### ActionDataインターフェース
適切な統合のために期待されるActionDataインターフェース：

```typescript
interface ActionData {
  success?: boolean;
  error?: string;
  message?: string;
  intent?: string;
}
```

## 高度な機能

### 状態リセット
両方のフックはダイアログオープン時に自動状態リセットを提供：

- `resetKey`がダイアログオープン毎に増加
- 子コンポーネントをクリーンな状態で強制的に再マウント
- 古いフォームデータやコンポーネント状態を防止

### 隠しフィールド
FormDialogは追加の隠しフォームフィールドをサポート：

```typescript
<FormDialog
  // ... other props
  hiddenFields={{
    userId: 123,
    category: "admin"
  }}
>
  {/* Form content */}
</FormDialog>
```

### カスタムスタイリング
ダイアログはカスタムCSSクラスとmax-width設定をサポート：

```typescript
<Dialog
  // ... other props
  maxWidth="max-w-2xl"
  className="custom-dialog-class"
>
  {/* Content */}
</Dialog>
```

## テスト

ダイアログシステムは包括的なテスト機能を含みます：

### ブラウザ操作
- **ESCキー** - ダイアログを閉じる
- **バックドロップクリック** - ダイアログを閉じる
- **タブナビゲーション** - 適切なフォーカス管理
- **スクリーンリーダー** - 完全なアクセシビリティサポート

### フォームテスト
- **バリデーション** - フォームバリデーションが自然に動作
- **送信** - 送信成功後の自動ダイアログクローズ
- **エラーハンドリング** - エラー表示と失敗時のダイアログ持続

## Context ベースシステムからの移行

Context Provider ベースのダイアログシステムから移行する場合：

1. **DialogProviderを削除** - アプリのルートから
2. **useDialogContext()を置換** - `useDialog()` または `useDialogWithAction()` に
3. **インポートを更新** - 新しいダイアログコンポーネントを使用
4. **DialogManagerコンポーネントを削除** - 存在する場合
5. **アクションハンドラーを更新** - 適切なActionData形式を返すように

## ベストプラクティス

### 各フックの使い分け
- **useDialog()** - シンプルダイアログ、確認、情報表示
- **useDialogWithAction()** - フォーム送信、フィードバックが必要なアクション

### パフォーマンス考慮事項
- ダイアログコンポーネントは軽量で最小限の再レンダリング
- `resetKey`による状態リセットは効率的でメモリリークを防止
- ネイティブブラウザ機能によりJavaScriptオーバーヘッドを削減

### アクセシビリティ
- 説明的なダイアログタイトルを使用
- ダイアログコンテンツ内で適切な見出し階層を確保
- アクセシブルなラベル付きの明確なアクションボタンを含める
- スクリーンリーダーとキーボードナビゲーションでテスト

## 例

全てのダイアログパターンと使用シナリオの完全な動作例については `/app/routes/test.dialogs.tsx` を参照してください。