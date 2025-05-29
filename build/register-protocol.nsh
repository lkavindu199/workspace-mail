!macro customInstall
  DetailPrint "🚀 Starting Workspace Mail protocol registration..."

  DeleteRegKey HKLM "Software\\Clients\\Mail\\WorkspaceMail"
  DetailPrint "✅ Deleted old Mail client key"

  DeleteRegKey HKCR "WorkspaceMailURL"
  DetailPrint "✅ Deleted old Protocol key"

  WriteRegStr HKLM "Software\\Clients\\Mail\\WorkspaceMail" "" "Workspace Mail"
  DetailPrint "📝 Wrote Clients\\Mail\\WorkspaceMail"

  WriteRegStr HKLM "Software\\Clients\\Mail\\WorkspaceMail\\Capabilities" "ApplicationDescription" "Electron-based Mail Client"
  WriteRegStr HKLM "Software\\Clients\\Mail\\WorkspaceMail\\Capabilities" "ApplicationName" "Workspace Mail"
  WriteRegStr HKLM "Software\\Clients\\Mail\\WorkspaceMail\\Capabilities\\URLAssociations" "mailto" "WorkspaceMailURL"
  DetailPrint "📝 Wrote Capabilities"

  WriteRegStr HKLM "Software\\Clients\\Mail\\WorkspaceMail\\DefaultIcon" "" "$INSTDIR\\Workspace Mail.exe,0"
  WriteRegStr HKLM "Software\\Clients\\Mail\\WorkspaceMail\\shell\\open\\command" "" '"$INSTDIR\\Workspace Mail.exe" "%1"'
  DetailPrint "📝 Wrote Command and Icon"

  WriteRegStr HKLM "Software\\RegisteredApplications" "Workspace Mail" "Software\\Clients\\Mail\\WorkspaceMail\\Capabilities"
  DetailPrint "📝 Registered in RegisteredApplications"

  WriteRegStr HKCR "WorkspaceMailURL" "" "URL:MailTo Protocol"
  WriteRegStr HKCR "WorkspaceMailURL" "URL Protocol" ""
  WriteRegStr HKCR "WorkspaceMailURL\\shell\\open\\command" "" '"$INSTDIR\\Workspace Mail.exe" "%1"'
  DetailPrint "✅ Completed protocol handler setup"

  DetailPrint "🎉 Registration complete!"
!macroend
