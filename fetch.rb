require 'json'
require 'csv'
require 'fileutils'

def get_page(page_number)
  curl = <<-EOS
curl 'https://api.enchor.us/search/advanced' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Accept-Language: en-US,en;q=0.9' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://www.enchor.us' \
  -H 'Referer: https://www.enchor.us/' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-site' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36' \
  -H 'sec-ch-ua: "Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  --data-raw '{"instrument":null,"difficulty":"expert","drumType":null,"drumsReviewed":false,"sort":null,"source":"website","name":{"value":"","exact":false,"exclude":false},"artist":{"value":"","exact":false,"exclude":false},"album":{"value":"","exact":false,"exclude":false},"genre":{"value":"","exact":false,"exclude":false},"year":{"value":"","exact":false,"exclude":false},"charter":{"value":"Harmonix","exact":true,"exclude":false},"minLength":null,"maxLength":null,"minIntensity":null,"maxIntensity":null,"minAverageNPS":null,"maxAverageNPS":null,"minMaxNPS":null,"maxMaxNPS":null,"minYear":null,"maxYear":null,"modifiedAfter":"","hash":"","trackHash":"","hasSoloSections":null,"hasForcedNotes":null,"hasOpenNotes":null,"hasTapNotes":null,"hasLyrics":null,"hasVocals":null,"hasRollLanes":null,"has2xKick":null,"hasIssues":null,"hasVideoBackground":null,"modchart":null,"page":#{page_number}}'

EOS
  JSON.parse(`#{curl}`)['data'] || []
rescue 
  []
end

# Accumulate this into downloaded_songs.csv with normalized fields
rows = []
page_number = 1

loop do
  page = get_page(page_number)
  break if page.empty?
  puts "fetching page #{page_number} (#{page.length} songs)"
  page.each do |song|
    length_in_seconds = ((song['song_length'] || 0).to_f / 1000).round
    length_str = format("%02d:%02d", length_in_seconds / 60, length_in_seconds % 60)
    diff_band = song['diff_band']
    unless diff_band
      diff_band = [
        song['diff_guitar'],
        song['diff_bass'],
        song['diff_drums'],
        song['diff_keys']
      ].compact.max
    end
    diff_band = [[diff_band || 0, 0].max, 6].min

    #  save all these fields
# {
#   "ordering": 1,
#   "name": "Metropolis—Part I: \"The Miracle and the Sleeper\"",
#   "artist": "Dream Theater",
#   "album": "Images and Words",
#   "genre": "Prog",
#   "year": "1992",
#   "md5": "9448c31dd5a3beb4c23e5eeaede4f8b3",
#   "charter": "Harmonix",
#   "song_length": 573997,
#   "diff_band": 6,
#   "diff_guitar": 6,
#   "diff_guitar_coop": -1,
#   "diff_rhythm": -1,
#   "diff_bass": 6,
#   "diff_drums": 6,
#   "diff_drums_real": 6,
#   "diff_keys": -1,
#   "diff_vocals": 6,
#   "album_track": 5,
#   "playlist_track": 16000,
#   "packName": "Rock Band 4",
# }
    rows << {
      id: song['md5'] || song['id'] || "song-#{rows.length + 1}",
      title: song['name']&.strip,
      artist: song['artist']&.strip,
      album: song['album']&.strip,
      genre: song['genre']&.strip,
      diff_band: diff_band,
      length: length_str,
      year: song['year'],
      seconds: length_in_seconds,
    }
  end
  page_number += 1
end

output = 'downloaded_songs.csv'
CSV.open(output, 'w') do |csv|
  csv << %w[id title artist album genre diff_band length year seconds]
  rows.each do |row|
    csv << [
      row[:id],
      row[:title],
      row[:artist],
      row[:album],
      row[:genre],
      row[:diff_band],
      row[:length],
      row[:year],
      row[:seconds],
    ]
  end
end

puts "Wrote #{rows.length} songs to #{output}"

web_output = File.join('web', 'src', 'data', 'downloaded_songs.csv')
if File.exist?(web_output)
  FileUtils.cp(output, web_output)
  puts "Copied CSV to #{web_output}"
end
