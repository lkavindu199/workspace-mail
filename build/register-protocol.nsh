!macro customInstall
  DetailPrint "Forcing Workspace Mail mailto handler..."

  DeleteRegKey HKLM "Software\\Clients\\Mail\\WorkspaceMail"
  DeleteRegKey HKCR "WorkspaceMailURL"

  WriteRegStr HKLM "Software\\Clients\\Mail\\WorkspaceMail" "" "Workspace Mail"
  WriteRegStr HKLM "Software\\Clients\\Mail\\WorkspaceMail\\Capabilities" "ApplicationDescription" "Electron-based Mail Client"
  WriteRegStr HKLM "Software\\Clients\\Mail\\WorkspaceMail\\Capabilities" "ApplicationName" "Workspace Mail"
  WriteRegStr HKLM "Software\\Clients\\Mail\\WorkspaceMail\\Capabilities\\URLAssociations" "mailto" "WorkspaceMailURL"
  WriteRegStr HKLM "Software\\Clients\\Mail\\WorkspaceMail\\DefaultIcon" "" "$INSTDIR\\Workspace Mail.exe,0"
  WriteRegStr HKLM "Software\\Clients\\Mail\\WorkspaceMail\\shell\\open\\command" "" '"$INSTDIR\\Workspace Mail.exe" "%1"'
  WriteRegStr HKLM "Software\\RegisteredApplications" "Workspace Mail" "Software\\Clients\\Mail\\WorkspaceMail\\Capabilities"

  WriteRegStr HKCR "WorkspaceMailURL" "" "URL:MailTo Protocol"
  WriteRegStr HKCR "WorkspaceMailURL" "URL Protocol" ""
  WriteRegStr HKCR "WorkspaceMailURL\\shell\\open\\command" "" '"$INSTDIR\\Workspace Mail.exe" "%1"'

  DetailPrint "Registration forced complete."
!macroend
