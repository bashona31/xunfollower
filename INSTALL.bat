@echo off
echo =============================================
echo    X Unfollower Pro - Fix File Extensions
echo =============================================
echo.

REM Fix .js files if they got renamed by Windows/antivirus
if exist "content.j_" ren "content.j_" "content.js"
if exist "background.j_" ren "background.j_" "background.js"
if exist "popup.j_" ren "popup.j_" "popup.js"

if exist "content.js_" ren "content.js_" "content.js"
if exist "background.js_" ren "background.js_" "background.js"
if exist "popup.js_" ren "popup.js_" "popup.js"

if exist "content" ren "content" "content.js"
if exist "background" ren "background" "background.js"
if exist "popup" ren "popup" "popup.js"

echo.
echo Checking files...
echo.

if exist "manifest.json" (echo [OK] manifest.json) else (echo [MISSING] manifest.json)
if exist "content.js" (echo [OK] content.js) else (echo [MISSING] content.js - RENAME MANUALLY!)
if exist "background.js" (echo [OK] background.js) else (echo [MISSING] background.js - RENAME MANUALLY!)
if exist "popup.js" (echo [OK] popup.js) else (echo [MISSING] popup.js - RENAME MANUALLY!)
if exist "popup.html" (echo [OK] popup.html) else (echo [MISSING] popup.html)
if exist "popup.css" (echo [OK] popup.css) else (echo [MISSING] popup.css)
if exist "icons\icon16.png" (echo [OK] icons/icon16.png) else (echo [MISSING] icons/icon16.png)
if exist "icons\icon48.png" (echo [OK] icons/icon48.png) else (echo [MISSING] icons/icon48.png)
if exist "icons\icon128.png" (echo [OK] icons/icon128.png) else (echo [MISSING] icons/icon128.png)

echo.
echo =============================================
echo    DONE! Now load in Chrome:
echo    chrome://extensions/ → Load unpacked
echo    Select THIS folder
echo =============================================
pause
