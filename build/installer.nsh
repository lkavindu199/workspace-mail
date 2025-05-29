!macro customInstall
  MessageBox MB_OK "✅ Registering Workspace Mail as mailto: handler..."

  StrCpy $0 "workspace-mail"
  StrCpy $1 "Workspace Mail"
  StrCpy $2 "$INSTDIR\\Workspace Mail.exe"
  StrCpy $3 "$0.mailto"

  ; Clean up
  DeleteRegKey HKCU "Software\\$0"
  DeleteRegKey HKCU "Software\\Classes\\$3"

  ; Register Capabilities
  WriteRegStr HKCU "Software\\$0\\Capabilities" "ApplicationName" "$1"
  WriteRegStr HKCU "Software\\$0\\Capabilities" "ApplicationDescription" "$1"
  WriteRegStr HKCU "Software\\$0\\Capabilities\\URLAssociations" "mailto" "$3"

  ; Register app in Default Apps
  WriteRegStr HKCU "Software\\RegisteredApplications" "$1" "Software\\$0\\Capabilities"

  ; Register protocol handler (ProgID)
  WriteRegStr HKCU "Software\\Classes\\$3" "" "URL:MailTo Protocol"
  WriteRegStr HKCU "Software\\Classes\\$3" "URL Protocol" ""
  WriteRegStr HKCU "Software\\Classes\\$3\\DefaultIcon" "" "$2,0"
  WriteRegStr HKCU "Software\\Classes\\$3\\shell\\open\\command" "" '"$2" "%1"'

  MessageBox MB_OK "✅ Workspace Mail successfully registered!"
!macroend
