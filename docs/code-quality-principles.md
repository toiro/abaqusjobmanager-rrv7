# コード品質原則

このドキュメントは、プロジェクトにおけるコード品質向上のための原則とガイドラインを定義します。

## 🎯 基本原則

### SOLID + KISS + YAGNI + DRY + **Readability**

従来のSOLID原則に加えて、**可読性（Readability）を最優先の判断基準**とします。

## 📖 可読性重視の抽象化原則

### **1. 可読性が最優先**

コードの抽象化において、**行数や使用回数よりも可読性を重視**します。

```typescript
// ❌ 低レイヤー処理がむき出し - 可読性が悪い
const jobId = id ? `#${id.toString().padStart(4, '0')}` : '-';
if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) { /* 何をチェックしているか不明確 */ }

// ✅ 意図が明確 - 可読性が良い
const jobId = formatJobId(job.id);
if (isValidEmail(user.email)) { /* 意図が明確 */ }
```

### **2. 抽象化レベルの統一**

同じ関数・コンポーネント内では、**同じレベルの抽象化**で統一します。

```typescript
// ❌ 抽象化レベルが混在
function processUser(user: User) {
  validateUser(user); // 高レベル
  if (user.email.includes('@')) { // 低レベル
    user.status = 'active'; // 低レベル
  }
  sendWelcomeEmail(user); // 高レベル
}

// ✅ 抽象化レベルが統一
function processUser(user: User) {
  validateUser(user);
  activateUserIfEmailValid(user);
  sendWelcomeEmail(user);
}
```

### **3. 低レイヤー処理の隠蔽**

以下の低レイヤー処理は必ず抽象化します：

- **正規表現**: `isValidEmail()`, `isValidPhoneNumber()`
- **文字列操作**: `toKebabCase()`, `capitalizeFirstLetter()`
- **日付操作**: `formatDisplayDate()`, `isExpired()`
- **数値計算**: `calculateTaxAmount()`, `formatCurrency()`
- **配列操作**: `groupByStatus()`, `sortByPriority()`

```typescript
// ✅ 1行でも抽象化の価値がある例
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const getCurrentTimestamp = () => Date.now();
const toKebabCase = (str: string) => str.toLowerCase().replace(/\s+/g, '-');
const formatJobId = (id?: number) => id ? `#${id.toString().padStart(4, '0')}` : '-';
```

## 🔍 判断基準マトリックス

| 基準 | 優先度 | 判断要素 | 例 |
|------|--------|----------|-----|
| **可読性** | **最高** | 意図が明確か？低レイヤー処理は隠蔽されているか？ | `formatJobId()` vs `padStart(4, '0')` |
| **抽象化レベル** | 高 | 同じレベルで統一されているか？ | 高レベル関数内に低レベル処理を混在させない |
| **再利用性** | 中 | 複数箇所で使用するか？ | 2箇所以上で使用なら抽象化検討 |
| **保守性** | 中 | 変更時の影響範囲は？ | ビジネスルールの変更が局所化されるか |
| **行数** | 低 | 可読性が確保されていれば行数は関係ない | 1行でも抽象化の価値がある |

## 🚫 YAGNI違反の判定

### **削除すべきコード**

1. **使用されていないコード**: インポートされていない、呼び出されていない
2. **重複機能**: 同じ目的で複数の実装が存在
3. **薄すぎるラッパー**: 実質的な価値を提供しない中間層
4. **推測による実装**: "将来使うかも"という理由で作られた機能

```typescript
// ❌ YAGNI違反の例
export function Input(props: React.ComponentPropsWithoutRef<"input">) {
  return <input type="text" placeholder="Input" {...props} />; // 使用されていない
}

// 薄すぎるラッパー
export function CancelJobDialog({ ...props }) {
  return <JobActionDialog actionType="cancel" {...props} />; // 実質的な価値なし
}
```

### **保持すべきコード**

```typescript
// ✅ 価値のある抽象化
export function JobActionDialog({ actionType, job, ...props }) {
  const config = ACTION_CONFIG[actionType]; // 設定による分岐
  // 実際のビジネスロジックが含まれる
  return <Dialog>{/* 複雑な実装 */}</Dialog>;
}
```

## 📁 ファイル・コンポーネント構成

### **適切な抽象化の例**

```typescript
// ✅ ユーティリティ関数 - 可読性向上
// utils/formatting.ts
export const formatJobId = (id?: number): string => 
  id ? `#${id.toString().padStart(4, '0')}` : '-';

export const formatDisplayDate = (dateString?: string): string => {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toISOString().replace('T', ' ').substring(0, 19);
  } catch {
    return dateString;
  }
};

// ✅ ビジネスロジック抽象化
// utils/job-status.ts
export const JobStatusRules = {
  canCancel: (status: JobStatus): boolean => 
    ['waiting', 'starting', 'running'].includes(status),
  canDelete: (status: JobStatus): boolean => 
    ['completed', 'failed', 'missing'].includes(status),
};
```

### **避けるべき抽象化**

```typescript
// ❌ 不要な抽象化
// utils/simple-wrappers.ts
export const getText = (text: string) => text; // 意味がない
export const addOne = (n: number) => n + 1; // 単純すぎる
```

## 🎯 実装ガイドライン

### **関数作成の判断フロー**

1. **処理の意図は明確か？**
   - No → 抽象化して意図を明確にする
   - Yes → 次へ

2. **低レイヤー処理が含まれているか？**
   - Yes → 抽象化して隠蔽する
   - No → 次へ

3. **複数箇所で使用されるか？**
   - Yes → 抽象化する
   - No → インライン化検討

4. **抽象化により可読性が向上するか？**
   - Yes → 抽象化する
   - No → インライン化

### **コンポーネント作成の判断フロー**

1. **真の再利用性があるか？**
   - 異なる文脈で使用可能
   - カスタマイズ可能な props

2. **実質的な価値を提供するか？**
   - ビジネスロジックの抽象化
   - 複雑な UI パターンの統一

3. **薄いラッパーではないか？**
   - 単純な props の受け渡しのみ
   - 設定の違いのみ

## 📝 コードレビューチェックリスト

### **可読性**
- [ ] 処理の意図が関数名・変数名から明確か？
- [ ] 低レイヤー処理が適切に隠蔽されているか？
- [ ] 抽象化レベルが統一されているか？

### **YAGNI準拠**
- [ ] 実際に使用されるコードか？
- [ ] 推測による実装ではないか？
- [ ] 薄すぎるラッパーになっていないか？

### **DRY原則**
- [ ] 同じ処理が複数箇所に散らばっていないか？
- [ ] 適切なレベルで抽象化されているか？

## 🔄 リファクタリング方針

1. **可読性優先**: まず意図を明確にする
2. **段階的改善**: 一度にすべてを変更しない
3. **テスト保護**: 動作を維持しながら改善
4. **チーム合意**: 抽象化の方針をチームで共有

---

**重要**: これらの原則は絶対的なルールではなく、**コードの可読性と保守性を向上させるためのガイドライン**です。文脈に応じて適切に適用してください。