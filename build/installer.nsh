!macro customInstall
  MessageBox MB_OK "📦 Starting Workspace Mail protocol registration..."

  StrCpy $0 "workspace-mail"
  StrCpy $1 "Workspace Mail"
  StrCpy $2 "$INSTDIR\\Workspace Mail.exe"
  StrCpy $3 "$0.mailto"

  ; 🧹 Reset user-level mailto default
  ExecWait 'reg.exe delete "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\mailto\\UserChoice" /f'

  ; 🧹 Optional cleanup of conflicting system handlers
  ExecWait 'reg.exe delete "HKLM\\Software\\Clients\\Mail\\Outlook" /f'
  ExecWait 'reg.exe delete "HKLM\\Software\\Clients\\Mail\\Mail" /f'
  ExecWait 'reg.exe delete "HKLM\\Software\\Clients\\Mail\\OneDrive" /f'
  ExecWait 'reg.exe delete "HKCR\\mailto" /f'
  ExecWait 'reg.exe delete "HKCR\\OutlookURL" /f'
  ExecWait 'reg.exe delete "HKCR\\OneDriveMailURL" /f'

  ; 🧹 Cleanup old entries for this app
  DeleteRegKey HKCU "Software\\$0"
  DeleteRegKey HKCU "Software\\Classes\\$3"

  ; 📝 Register Capabilities
  WriteRegStr HKCU "Software\\$0\\Capabilities" "ApplicationName" "$1"
  WriteRegStr HKCU "Software\\$0\\Capabilities" "ApplicationDescription" "$1"
  WriteRegStr HKCU "Software\\$0\\Capabilities\\URLAssociations" "mailto" "$3"

  ; 📝 Register in Default Apps list
  WriteRegStr HKCU "Software\\RegisteredApplications" "$1" "Software\\$0\\Capabilities"

  ; 📝 Register mailto protocol handler
  WriteRegStr HKCU "Software\\Classes\\$3" "" "URL:MailTo Protocol"
  WriteRegStr HKCU "Software\\Classes\\$3" "URL Protocol" ""
  WriteRegStr HKCU "Software\\Classes\\$3\\DefaultIcon" "" "$2,0"
  WriteRegStr HKCU "Software\\Classes\\$3\\shell\\open\\command" "" '"$2" "%1"'

  MessageBox MB_OK "✅ Workspace Mail is ready. Please select it as the default mail app."
!macroend
