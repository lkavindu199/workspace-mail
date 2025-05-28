!macro customInstall
  WriteRegStr HKCU "Software\Classes\mailto" "" "URL:MailTo Protocol"
  WriteRegStr HKCU "Software\Classes\mailto" "URL Protocol" ""

  WriteRegStr HKCU "Software\Classes\mailto\DefaultIcon" "" "$INSTDIR\\Workspace Mail.exe,1"

  WriteRegStr HKCU "Software\Classes\mailto\shell" "" "open"
  WriteRegStr HKCU "Software\Classes\mailto\shell\open\command" "" '"$INSTDIR\\Workspace Mail.exe" "%1"'

  ; Optional logging
  DetailPrint "Registered mailto protocol to $INSTDIR\\Workspace Mail.exe"
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\mailto"
  DetailPrint "Unregistered mailto protocol"
!macroend
