Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

portableDir = fso.GetParentFolderName(WScript.ScriptFullName)
portableDir = fso.GetParentFolderName(portableDir) ' go from windows/ to portable/
projectRoot = fso.GetParentFolderName(portableDir)

pyHome = portableDir & "\windows\python"
pythonw = pyHome & "\pythonw.exe"

If Not fso.FileExists(pythonw) Then
  MsgBox "Python portátil não encontrado em: " & pythonw & vbCrLf & "Copie novamente o conteúdo completo do pendrive.", vbCritical, "Saiku Lite"
  WScript.Quit 1
End If

verifyScript = portableDir & "\windows\verify_env.pyw"
cmdVerify = """" & pythonw & """ """ & verifyScript & """"
ret = shell.Run(cmdVerify, 0, True)
If ret <> 0 Then
  WScript.Quit ret
End If

launcher = portableDir & "\launch.py"
cmdLaunch = """" & pythonw & """ """ & launcher & """"
shell.Run cmdLaunch, 0, False
