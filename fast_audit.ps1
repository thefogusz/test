
$sources = @(
    "OpenAI Blog|https://openai.com/blog/rss.xml",
    "TechCrunch AI|https://techcrunch.com/category/artificial-intelligence/feed/",
    "Microsoft Research|https://www.microsoft.com/en-us/research/feed/",
    "VentureBeat AI|https://venturebeat.com/category/ai/feed/",
    "MIT Tech Review|https://www.technologyreview.com/topic/artificial-intelligence/feed/",
    "Verge|https://www.theverge.com/rss/index.xml",
    "Ars Technica|https://feeds.arstechnica.com/arstechnica/index",
    "Wired|https://www.wired.com/feed/rss",
    "Beartai|https://www.beartai.com/feed",
    "Techsauce|https://techsauce.co/feed",
    "BBC Tech|http://feeds.bbci.co.uk/news/technology/rss.xml",
    "The Register|https://www.theregister.com/headlines.rss",
    "SciTechDaily|https://scitechdaily.com/feed/",
    "Cointelegraph|https://cointelegraph.com/rss",
    "Decrypt|https://decrypt.co/feed",
    "CoinDesk|https://www.coindesk.com/arc/outboundfeeds/rss/",
    "The Block|https://www.theblock.co/rss.xml",
    "CryptoSlate|https://cryptoslate.com/feed/",
    "Fortune|https://fortune.com/feed/",
    "Fast Company|https://www.fastcompany.com/rss",
    "Economist|https://www.economist.com/latest/rss.xml",
    "CNBC|https://www.cnbc.com/id/100003114/device/rss/rss.html",
    "Bloomberg|https://feeds.bloomberg.com/markets/news.rss"
)

$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"

foreach ($item in $sources) {
    if (-not $item -or -not $item.Contains("|")) { continue }
    $parts = $item.Split("|")
    $name = $parts[0]
    $url = $parts[1]
    
    # Use curl.exe for better header handling/impersonation
    $output = curl.exe -L -s -m 7 -A $ua --range 0-1000 $url
    
    if (-not $output) {
        Write-Output "FAIL: [$name] (No response/Timeout)"
    } elseif ($output -match "^<!DOCTYPE html" -or $output -match "^<html") {
        Write-Output "BLOCK: [$name] (Got HTML - Cloudflare/Redirect)"
    } elseif ($output -match "<\?xml" -or $output -match "<rss" -or $output -match "<feed") {
        Write-Output "OK: [$name] (XML detected)"
    } else {
        $len = [Math]::Min(30, $output.Length)
        if ($len -gt 0) {
            $sample = $output.Substring(0, $len).Trim()
            Write-Output "UNKNOWN: [$name] (Sample: $sample)"
        } else {
            Write-Output "UNKNOWN: [$name] (Empty response body)"
        }
    }
}
