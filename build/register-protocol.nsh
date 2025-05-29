!macro customInstall
  DetailPrint "Registering Workspace Mail..."

  WriteRegStr HKLM "Software\Clients\Mail\WorkspaceMail" "" "Workspace Mail"
  DetailPrint "Set Clients\\Mail\\WorkspaceMail"

  WriteRegStr HKLM "Software\Clients\Mail\WorkspaceMail\Capabilities" "ApplicationDescription" "Electron-based Mail Client"
  WriteRegStr HKLM "Software\Clients\Mail\WorkspaceMail\Capabilities" "ApplicationName" "Workspace Mail"
  WriteRegStr HKLM "Software\Clients\Mail\WorkspaceMail\Capabilities\URLAssociations" "mailto" "WorkspaceMailURL"
  DetailPrint "Set Capabilities"

  WriteRegStr HKLM "Software\Clients\Mail\WorkspaceMail\DefaultIcon" "" "$INSTDIR\\Workspace Mail.exe,0"
  WriteRegStr HKLM "Software\Clients\Mail\WorkspaceMail\shell\\open\\command" "" '"$INSTDIR\\Workspace Mail.exe" "%1"'
  DetailPrint "Set open command"

  WriteRegStr HKLM "Software\\RegisteredApplications" "Workspace Mail" "Software\\Clients\\Mail\\WorkspaceMail\\Capabilities"
  DetailPrint "Registered in RegisteredApplications"

  WriteRegStr HKCR "WorkspaceMailURL" "" "URL:MailTo Protocol"
  WriteRegStr HKCR "WorkspaceMailURL" "URL Protocol" ""
  WriteRegStr HKCR "WorkspaceMailURL\\shell\\open\\command" "" '"$INSTDIR\\Workspace Mail.exe" "%1"'
  DetailPrint "Set protocol handler"

  DetailPrint "Registration complete."
!macroend
