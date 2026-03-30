# Kapakka PubApp — Changelog

Minden változtatás dátummal és leírással.

---

## [1.3.1] — 2026-03-31

### 🐛 Hibajavítások
- `src/lib/place-search.ts` build fix: a `rows.map(...).filter(...)` láncban explicit típusozás került bevezetésre, így a `noImplicitAny` már nem állítja meg a production buildet
- A `place-search` frontend helper most külön `normalizedRows: ExternalPlace[]` köztes tömböt használ a stabilabb TypeScript inference érdekében
- `codingLessonsLearnt.md` bővítve új TypeScript hibamintával az implicit `any` megelőzésére chained callback-eknél
