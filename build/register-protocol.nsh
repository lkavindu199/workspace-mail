!macro customInstall
  WriteRegStr HKCU "Software\Clients\Mail\WorkspaceMail" "" "Workspace Mail"
  WriteRegStr HKCU "Software\Clients\Mail\WorkspaceMail\Capabilities" "ApplicationDescription" "Electron-based Mail Client"
  WriteRegStr HKCU "Software\Clients\Mail\WorkspaceMail\Capabilities" "ApplicationName" "Workspace Mail"
  WriteRegStr HKCU "Software\Clients\Mail\WorkspaceMail\Capabilities\URLAssociations" "mailto" "WorkspaceMailURL"
  WriteRegStr HKCU "Software\Clients\Mail\WorkspaceMail\DefaultIcon" "" "$INSTDIR\\Workspace Mail.exe,0"
  WriteRegStr HKCU "Software\Clients\Mail\WorkspaceMail\shell\\open\\command" "" '"$INSTDIR\\Workspace Mail.exe" "%1"'
  WriteRegStr HKCU "Software\\RegisteredApplications" "Workspace Mail" "Software\\Clients\\Mail\\WorkspaceMail\\Capabilities"

  WriteRegStr HKCR "WorkspaceMailURL" "" "URL:MailTo Protocol"
  WriteRegStr HKCR "WorkspaceMailURL" "URL Protocol" ""
  WriteRegStr HKCR "WorkspaceMailURL\\shell\\open\\command" "" '"$INSTDIR\\Workspace Mail.exe" "%1"'
!macroend
