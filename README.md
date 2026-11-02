# 葡萄を恋にする魔法

手機直式單頁體驗的第一版。以 iPhone 15 Pro（393 × 852）Safari 為主要設計基準。

## 本機預覽

請在此資料夾執行：

```bash
python3 -m http.server 4173
```

再開啟 `http://localhost:4173/`。

## 日後替換素材

- 影片：直接覆蓋 `assets/video.mp4`，並將 `index.html` 裡的 `?v=1` 往上加一。
- 封面：覆蓋 `assets/cover.png` 與 `assets/cover.jpg`。
- 結尾文字：填入 `index.html` 的 `.ending-copy`，再於 CSS 開啟顯示。

目前的封面取自 `FRONT.png`，屬於暫用素材；為避免裁切，採夜藍留邊方式呈現。
