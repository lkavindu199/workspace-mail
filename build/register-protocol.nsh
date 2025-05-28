!macro customInstall
  ; Register app in StartMenuInternet
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\WorkspaceMail" "" "Workspace Mail"
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\WorkspaceMail\Capabilities" "ApplicationName" "Workspace Mail"
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\WorkspaceMail\Capabilities" "ApplicationDescription" "Electron-based Mail App"
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\WorkspaceMail\Capabilities" "ApplicationIcon" "$INSTDIR\\Workspace Mail.exe,0"

  ; Register mailto handler
  WriteRegStr HKLM "Software\Clients\StartMenuInternet\WorkspaceMail\Capabilities\URLAssociations" "mailto" "WorkspaceMail.URL.mailto"

  ; Declare application protocol handler
  WriteRegStr HKLM "Software\Classes\WorkspaceMail.URL.mailto" "" "Workspace Mail Mailto Protocol"
  WriteRegStr HKLM "Software\Classes\WorkspaceMail.URL.mailto" "URL Protocol" ""
  WriteRegStr HKLM "Software\Classes\WorkspaceMail.URL.mailto\shell\open\command" "" '"$INSTDIR\\Workspace Mail.exe" "%1"'

  ; Register with RegisteredApplications so Windows shows it in Default Apps
  WriteRegStr HKLM "Software\RegisteredApplications" "Workspace Mail" "Software\\Clients\\StartMenuInternet\\WorkspaceMail\\Capabilities"
!macroend

!macro customUnInstall
  DeleteRegValue HKLM "Software\RegisteredApplications" "Workspace Mail"
  DeleteRegKey HKLM "Software\Clients\StartMenuInternet\WorkspaceMail"
  DeleteRegKey HKLM "Software\Classes\WorkspaceMail.URL.mailto"
!macroend
