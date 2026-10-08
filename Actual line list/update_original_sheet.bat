@echo off
echo Updating UHRP Line List-2026-27.xlsx with populated data...
copy /Y "%~dp0UHRP Line List-2026-27_Populated.xlsx" "%~dp0UHRP Line List-2026-27.xlsx"
if %errorlevel% equ 0 (
    echo Successfully updated UHRP Line List-2026-27.xlsx!
) else (
    echo Error: Please make sure UHRP Line List-2026-27.xlsx is closed in Excel and try again.
)
pause
