Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c """ & Replace(WScript.ScriptFullName, "run_server_hidden.vbs", "run_server.bat") & """", 0, False
