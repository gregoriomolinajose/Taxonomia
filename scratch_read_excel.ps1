 = New-Object -ComObject Excel.Application
$excel.Visible = $false
$workbook = $excel.Workbooks.Open("C:\Users\grego\Downloads\Modelo de Capacidades de Grupo 2.0 VF.xlsx")
$sheet = $workbook.Sheets.Item(1)
for ($i=1; $i -le 3; $i++) {
    $row = ""
    for ($j=1; $j -le 7; $j++) {
        $row += $sheet.Cells.Item($i, $j).Text + " | "
    }
    Write-Output $row
}
$workbook.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
