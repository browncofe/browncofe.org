# 北科大圖書館座位預約

四個頁面共用同一套座位資料。讀者可先查空位、選日期與時段、在平面圖篩選靠窗或有插座的座位，再登入完成預約。到館後可報到、暫離、返回及結束使用。

**發布目錄是 `docs/`，首頁是 `docs/index.html`。** 整包解壓後可用 GitHub 和 Supabase 網頁完成部署。瀏覽器直接執行 HTML、CSS 和 JavaScript，所有前端程式與圖示都在包內。

## 1．建立專案並執行資料庫設定

1. 登入 Supabase Dashboard，選 **New project**，建立用於這個作品的專案，等候專案啟動。
2. 在左側開啟 **SQL Editor → New query**。用文字編輯器開啟 ZIP 內的 `setup.sql`，複製整份內容，貼進編輯器後按 **Run**。
3. 成功後，在 **Table Editor** 的 schema 選單選 `reading_room`。`zones` 應有 3 筆，`seats` 應有 66 筆，`bookings` 在全新專案應為空表。A、B 區各 24 席，C 區 18 席並預設維護。這些是原設計的空間配置。
4. 保持專案的 **Data API** 已啟用，並確認公開 API 的 exposed schemas 包含 `public`。`reading_room` 保持私有。SQL 已設定公開查詢、登入者的操作權限與 Realtime publication。
5. 在專案的 **Connect** 面板取得 **Project URL**，並從 **Settings → API Keys** 取得同一專案的 **Publishable key**（`sb_publishable_` 開頭）。兩個值稍後貼到 `config.js`。

`setup.sql` 使用交易，可在本專案重跑。相同編號的座位、規則和既有預約會保留。請為此作品保留 `reading_room` schema 和 `public.rr_*` 名稱。所有預約交易、報到期限檢查和權限驗證均由 PostgreSQL 執行。Edge Functions 部署步驟為零。

## 2．設定電子郵件登入

1. 在 **Authentication → Sign In / Providers**（有些介面顯示 **Providers**）啟用 **Email**。若開放自行註冊，同時啟用 **Allow new users to sign up**。
2. 在 **Authentication → URL Configuration**，將 **Site URL** 設成預定網站的完整網址，例如 `https://你的帳號.github.io/你的儲存庫/`。在 **Redirect URLs** 也加入同一個完整網址，保留儲存庫名稱和最後的斜線。
3. 讀者在網站點 **登入／註冊**，填電子郵件與密碼。新讀者點 **註冊新帳號**，已有帳號的讀者點 **登入**。開啟 **Confirm email** 時，請保留 Supabase 預設確認信中的 `{{ .ConfirmationURL }}` 連結。點信件連結完成驗證後，回到本站以密碼登入。
4. **課堂驗收可全程免寄信。** 在 **Authentication → Users → Add user → Create new user** 建立兩組不同的測試帳號，設定密碼並勾選 **Auto Confirm User**。接著直接在網站登入。在獨立的課堂測試專案，也可關閉 **Confirm email** 來驗收自助註冊。這個選項會讓使用者以尚未驗證所有權的信箱建立帳號。
5. Supabase 預設郵件服務限制收件人與寄送頻率，通常只能寄給專案團隊成員。若專案已有自訂寄信設定即可沿用。本網站部署與雙帳號驗收都可使用上一步的免寄信流程。

登入狀態保留於目前的瀏覽器分頁，重整可繼續使用。個人預約保存在資料庫，同一帳號在其他裝置重新登入後即可查閱。

## 3．上傳與填寫 config.js

1. 在 GitHub 建立儲存庫；GitHub Free 的 Pages 可從公開儲存庫發布。若要沿用原儲存庫，先保留原始版本，再確認發布位置使用 `docs/`。
2. 解壓縮交付的 ZIP。在儲存庫首頁選 **Add file → Upload files**，拖入解壓後的 `docs` 資料夾、`README.md`、`setup.sql`、`verify.sql` 與 `reference` 資料夾，再按 **Commit changes**。在儲存庫首頁應直接看到 `docs`；點進去能看到 `index.html`、`config.js`、`app.js`、`views.js`、`api.js`、`style.css` 與 `book.svg`。`.nojekyll` 是空檔，若拖曳時被略過，可用 **Add file → Create new file** 補建 `docs/.nojekyll`。
3. 在 GitHub 開啟 `docs/config.js`，按鉛筆 **Edit this file**。將同一 Supabase 專案的兩個值分別貼進雙引號，再按 **Commit changes**。

```js
export const SUPABASE_URL = "https://你的專案識別碼.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "貼上你的 sb_publishable_ 開頭金鑰";
```

瀏覽器可讀取發布目錄中的所有檔案。`config.js` 只填 Project URL 和 Publishable key。資料庫密碼、`sb_secret_` 金鑰、`service_role` 金鑰和個人 Auth token 均屬私密憑證。

## 4．開啟 GitHub Pages

1. 到儲存庫 **Settings → Pages → Build and deployment**，將 **Source** 選為 **Deploy from a branch**。
2. 選剛才提交的分支，通常是 **main**。目錄選 **/docs**，按 **Save**。
3. 等 Pages 顯示成功後按 **Visit site**。網址是 `https://你的帳號.github.io/你的儲存庫/`。網址裡不用加 `/docs/`。
4. 開啟首頁，確認「目前即時空位」有更新時間。再由座位圖複製網址，應以 `/#seatmap` 結尾；新分頁開啟、直接重整、上一頁均可使用。首頁、模組、圖示與 CSS 使用相對路徑。從檔案總管雙擊 HTML 會受到瀏覽器本機模組限制，請使用 Pages 網址驗收。

## 5．部署後實際驗收

用一個一般視窗登入 A 帳號，另一個無痕視窗或不同瀏覽器登入 B 帳號。以下動作都會操作自己架設的座位預約系統。

| 操作 | 應看到的結果 |
| --- | --- |
| 訪客開啟總覽、切換時段、檢視地圖 | 可以讀取空位；「我的預約」要求登入。全新資料庫的開放座位無人占用。即時空位在閉館時間顯示休館；仍可查未來時段。 |
| 在月曆選未來日期，設定 10:00–12:00，切換 A、B、C 區 | 時段摘要顯示 2 小時。勾選「有插座」與「靠窗」只可選符合兩者的座位。C 區預設無法預約。 |
| A、B 同時選同一席、同一時段，兩邊確認送出 | 至多一筆成功。另一次會被資料庫拒絕，或在送出前收到更新而需重新選位。重新整理後兩邊都能看到該席已預約。 |
| 成功者再選相同或部分重疊的時段，B 開啟自己的預約 | 同一讀者無法建立重疊預約。B 的清單只能看到自己的紀錄。兩個前後銜接的時段可以分開預約。 |
| 取消待報到的預約，讓另一人再次預約 | 先出現確認框。「返回」保留預約；確認取消後歷史紀錄顯示「已取消」，座位重新開放。 |
| 在下一個整點前預約，等到整點後、寬限期限前按「報到」 | 待報到轉為使用中。提前報到會被拒絕；超過期限則歸入歷史。 |
| 已報到者按「暫時離座」、「返回座位」，再按「結束使用」 | 顯示返回期限；按時返回可繼續使用。結束後進入歷史且釋出座位。另一次測試可讓暫離逾時，確認座位釋出。 |
| 關閉分頁後重新登入，或用另一部裝置登入同一帳號 | 同一筆預約及歷史可再次查到。手動將電腦時間往前調，資料庫仍依伺服器時間判定。 |
| 開著兩個視窗，A 預約或取消，B 留在座位圖 | B 應自動重查空位。Realtime 可用時由通知觸發；未連線時，前景分頁每 25 秒重查，也能手動重新整理。 |

**可選的資料庫驗收**：在全新測試專案建立兩個專用測試帳號，從 **Authentication → Users** 複製各自的 **User UID**。在 `verify.sql` 頂端填入兩個 UID，於 SQL Editor 整份執行。它會切換匿名與登入角色，檢查跨帳號讀寫、時段衝突、同一次提交重送、提前報到、暫離、返回與釋出。測試在同一筆交易內完成並回滾；明日 08:00–10:00 的 A-001、A-002 須可預約。多裝置併發與真正的 Auth、Realtime 連線仍應用上表測試。

## 6．館方設定與資料邊界

- **預設時段**為臺灣時間 08:00–22:00，整點起訖。日期視窗從今天到下個月月底。當日已經開始的整點時段不再接受新預約。
- **預設規則**延續原型，報到寬限 15 分鐘、暫離保留 30 分鐘。這是課程作品的預設值。需套用實際場地規範時，專案管理者可在 SQL Editor 修改。每筆預約保存建立時的期限設定。
- **維護與休館**用資料庫管理。`reading_room.zones.maintenance` 控制整區，`reading_room.seats.maintenance` 控制單席。`reading_room.closures` 每筆包含 `day` 和 `reason`。關閉區域或新增休館日會阻止新的預約；已成立的預約仍可由原讀者管理。請先處理受影響的既有預約。
- **個資與即時更新**：所有內部資料表均啟用 RLS，並撤銷網頁角色的 schema、資料表與內部函式權限。前端只呼叫下列具名 RPC。資料庫從 `auth.uid()` 取得身分，讀者不能自行指定擁有者。Realtime 僅發布 `public.rr_signal` 的版本號。管理者從 Supabase 專案後台管理，不需額外管理員金鑰。
- **預約一致性**：每次送出在同一交易內檢查時段、座位、維護、休館及登入者。按「座位＋日期＋小時」與「讀者＋日期＋小時」分別建立唯一限制。同一筆送出有去重識別碼。期限由資料庫時計算；即使沒有網頁開著，下一次查詢也會立即顯示逾時。下一次成功寫入時會整理到期紀錄。

管理範例，以下指令分別按需要執行：

```sql
-- 調整未來新預約的規則，例如暫離可保留 60 分鐘
update reading_room.rules set grace=15, away=60 where id=1;

-- 設備維護完畢，開放 C 區
update reading_room.zones set maintenance=false where id='C';

-- 以實際閉館日與原因取代範例日期
insert into reading_room.closures(day, reason) values ('2030-05-06','館舍設備保養')
on conflict(day) do update set reason=excluded.reason;
```

| 前端呼叫 | 權限與用途 |
| --- | --- |
| `rr_snapshot(p_day,p_start,p_end)` | 訪客可查時段及各席使用狀態；登入者另取得自己的重疊提示、預約計數與最近一筆。 |
| `rr_my_bookings(p_tab,p_offset)` | 登入者查自己的待報到、使用中與歷史紀錄，支援翻頁。 |
| `rr_reserve(p_seat,p_day,p_start,p_end,p_request)` | 登入者建立預約；資料庫防止超賣及同人重疊。 |
| `rr_act(p_id,p_action)` | 僅預約本人能在允許的狀態執行 `checkin`、`away`、`return`、`cancel`、`end`。 |

## 7．原專案與新版差異

原始 GitHub 壓縮檔內含的提交為 `8bb5bd840ebe34f445d7410ca11e136d73d5cc69`。

| 原版 | 新版 |
| --- | --- |
| React 19、TypeScript、Vite、Tailwind CSS、Lucide React；套件清單另列 Express、dotenv、Motion、Google GenAI。四個頁面由 `App.tsx` 切換。 | 四個 hash 頁面使用原生 HTML、CSS、JavaScript。沿用紙白底色、苔綠、明體標題、分區卡片與雙席桌平面圖。省去 npm、Node、CDN 與建置。 |
| 使用固定示範學生、固定日期、五筆預約與雜湊產生的背景占用。 | Supabase Email Auth、伺服器臺灣時間、真實預約及即時通知。新專案從零筆預約開始。日期範圍跟著月份推進，舊的示範休館日由管理者依需求設定。 |
| 預約與規則保存在 localStorage，展示者可重設或調整資料。 | 帳號跨裝置共用預約。讀者自行管理自己的紀錄；規則由管理者設定。舊版示範學生與紀錄不會匯入。 |
| 示範到館按鈕直接更改本機狀態。 | 登入者在網頁自行報到，後端檢查身分和時間。沒有實體刷卡機、GPS 或校務單一登入驗證。 |
| 套件與環境範本提到 Gemini，頁面未呼叫模型，也沒有必須保留的 Express API 路由。 | 資料查詢與交易使用 Supabase Database，帳號使用 Auth。整個流程不需 Gemini、額外服務金鑰或 Edge Functions。 |
| 四張原始 PNG 為原專案附帶的設計參考。 | 原檔完整保留在 `reference/`。實際操作的座位圖由資料庫座位資料產生，能逐席點選及更新。 |

## 8．交付前已驗證與尚待驗證

**已驗證**

- 在 Chrome 以 `/brown-test/` 子路徑載入交付的 HTML、CSS、JavaScript 與圖示，檢查 hash 直接進入、重新整理、日曆換月、操作指南和無憑證畫面。資源請求由本機交付內容回應。測試期間沒有頁面腳本錯誤或缺檔回應。
- 在桌面與 390px 寬度執行介面測試。修正窄螢幕平面圖撐開整頁的問題，地圖可在自己的框內水平捲動。
- 使用隔離的 API 測試回應操作登入、日期與起訖時間、休館日、A／B／C 區、篩選交集、縮放、預約確認、取消確認、報到、暫離、返回、結束使用及歷史紀錄。另測試版本通知觸發重查、請求失敗與恢復。這些測試回應僅用於開發驗收，發布檔案不含測試帳號、預約或模擬 API。
- 檢查四個前端 RPC 的參數名稱與 SQL 對應、Realtime 訂閱與 publication 的資料表名稱、JS 語法、原始圖片完整性與 ZIP 目錄。

**仍需部署後驗證**

- 本次沒有連入你的 Supabase 或 GitHub 帳號。`setup.sql` 和 `verify.sql` 已作程式碼與呼叫介面檢查，尚未在真正的 PostgreSQL／Supabase 執行。
- 請實測 GitHub Pages 網址、首次執行與重跑 SQL、真正的註冊／信箱驗證／登入和 token 更新、雙帳號 RLS 隔離、兩人同時搶位、時間截止邊界，以及 Realtime 送達。驗收流程見第 5 節。

## 常見問題

| 畫面或訊息 | 檢查方式 |
| --- | --- |
| Pages 出現 404 或舊站 | 確認發布分支及 `/docs`，查看儲存庫 **Actions** 裡最新的 Pages 發布結果，並核對 `docs/index.html` 位於該分支。 |
| 尚未連接資料庫 | 檢查線上 `config.js` 裡的兩個引號、完整 `https://` URL 及 `sb_publishable_` 開頭金鑰，再重新整理。 |
| 找不到 `rr_snapshot` 或回傳權限錯誤 | 確認 URL 與金鑰屬於同一專案、SQL 整份執行成功，且 Data API 已啟用並公開 `public` schema。 |
| 收不到驗證信 | 查看 Auth Logs、確認寄信限制和垃圾郵件匣，或依第 2 節建立已驗證的測試帳號。 |
| 只顯示「定期更新」 | 確認 `public.rr_signal` 在 `supabase_realtime` publication 裡，並允許瀏覽器連至專案的 `wss://`。手動重新整理可獨立查證資料庫是否已更新。 |
| 送出時連線中斷 | 先開「我的預約」確認結果。若已成立會在待報到顯示，再次送出也會經過資料庫重疊檢查。 |

官方文件：[GitHub Pages 發布來源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) · [Supabase 金鑰](https://supabase.com/docs/guides/getting-started/api-keys) · [Email 登入](https://supabase.com/docs/guides/auth/passwords) · [內建寄信限制](https://supabase.com/docs/guides/auth/auth-smtp) · [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) · [Realtime](https://supabase.com/docs/guides/realtime/postgres-changes)

