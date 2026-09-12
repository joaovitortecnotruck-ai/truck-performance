<#
.SYNOPSIS
  Cliente de linha de comando pro servico Simos18 Patch Agent (services\simos18-agent\api.py).
  Le a API_KEY do .env automaticamente - so usar os comandos abaixo.

.EXAMPLE
  .\tp-multimapa.ps1 identificar "C:\pedidos\cliente1.bin"

.EXAMPLE
  .\tp-multimapa.ps1 listar S50

.EXAMPLE
  .\tp-multimapa.ps1 aplicar "C:\pedidos\cliente1.bin" "SL PATCH.29.33 - S50.btp" "C:\pedidos\cliente1_multimapa.bin"
#>
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet("identificar", "listar", "aplicar")]
    [string]$Comando,

    [Parameter(Position = 1)]
    [string]$Arg1,

    [Parameter(Position = 2)]
    [string]$Arg2,

    [Parameter(Position = 3)]
    [string]$Arg3,

    [ValidateSet("normal", "ignore", "force")]
    [string]$Modo = "ignore"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $scriptDir ".env"
$baseUrl = "http://127.0.0.1:8787"

if (-not (Test-Path $envFile)) {
    Write-Error "Nao achei o arquivo .env em $envFile"
    exit 1
}

$apiKey = (Get-Content $envFile | Where-Object { $_ -match '^API_KEY=' }) -replace '^API_KEY=', ''
if ([string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Error "API_KEY nao encontrada no .env"
    exit 1
}

$headers = @{ Authorization = "Bearer $apiKey" }

# confere se o servidor esta no ar antes de qualquer coisa
try {
    Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -TimeoutSec 3 | Out-Null
} catch {
    Write-Error "Servidor nao respondeu em $baseUrl. Ele esta rodando? (deveria subir sozinho no login, ou rode manualmente run_server_hidden.vbs)"
    exit 1
}

switch ($Comando) {
    "identificar" {
        if (-not $Arg1) { Write-Error "Uso: tp-multimapa.ps1 identificar <bin>"; exit 1 }
        if (-not (Test-Path $Arg1)) { Write-Error "Arquivo nao encontrado: $Arg1"; exit 1 }

        curl.exe -s -X POST "$baseUrl/identify" `
            -H "Authorization: Bearer $apiKey" `
            -F "bin=@$Arg1;type=application/octet-stream" | ConvertFrom-Json | Format-List
    }

    "listar" {
        $url = "$baseUrl/patches"
        if ($Arg1) { $url += "?hw_code=$Arg1" }
        Invoke-RestMethod -Uri $url -Method Get -Headers $headers | Select-Object -ExpandProperty patches
    }

    "aplicar" {
        if (-not $Arg1 -or -not $Arg2 -or -not $Arg3) {
            Write-Error "Uso: tp-multimapa.ps1 aplicar <bin_cliente> <nome_do_patch.btp> <bin_saida> [-Modo normal|ignore|force]"
            exit 1
        }
        if (-not (Test-Path $Arg1)) { Write-Error "Arquivo nao encontrado: $Arg1"; exit 1 }

        Write-Output "Aplicando [$Arg2] (modo: $Modo) em [$Arg1] ..."
        $status = curl.exe -s -o $Arg3 -w "%{http_code}" -X POST "$baseUrl/apply" `
            -H "Authorization: Bearer $apiKey" `
            -F "bin=@$Arg1;type=application/octet-stream" `
            -F "patch_names=$Arg2" `
            -F "mode=$Modo"

        if ($status -eq "200") {
            Write-Output "OK - gravado em $Arg3"
        } else {
            Write-Output "FALHOU (HTTP $status). Conteudo salvo em $Arg3 pode ser uma mensagem de erro em JSON:"
            Get-Content $Arg3
        }
    }
}
