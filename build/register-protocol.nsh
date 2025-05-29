!macro customInstall
  ; Define protocol and identifiers
  StrCpy $0 "workspace-mail"
  StrCpy $1 "Workspace Mail"
  StrCpy $2 "$INSTDIR\\Workspace Mail.exe"
  StrCpy $3 "$0.mailto"

  ; Register application capabilities
  WriteRegStr HKCU "Software\$0\Capabilities" "ApplicationName" "$1"
  WriteRegStr HKCU "Software\$0\Capabilities" "ApplicationDescription" "Electron-based Mail App"
  WriteRegStr HKCU "Software\$0\Capabilities" "ApplicationIcon" "$2,0"
  WriteRegStr HKCU "Software\$0\Capabilities\URLAssociations" "mailto" "$3"

  ; Register in default apps list
  WriteRegStr HKCU "Software\RegisteredApplications" "$0" "Software\\$0\\Capabilities"

  ; Set up mailto protocol handler
  WriteRegStr HKCU "Software\Classes\$3" "" "$1 Mailto Protocol"
  WriteRegStr HKCU "Software\Classes\$3" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\$3\shell\open\command" "" '"$2" "%1"'
!macroend

!macro customUnInstall
  StrCpy $0 "workspace-mail"
  StrCpy $3 "$0.mailto"

  DeleteRegValue HKCU "Software\RegisteredApplications" "$0"
  DeleteRegKey HKCU "Software\$0"
  DeleteRegKey HKCU "Software\Classes\$3"
!macroend
