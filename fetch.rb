require 'json'
require 'csv'
require 'fileutils'

def truthy?(value)
  value.to_s.strip.downcase == 'true'
end

def load_source_info(path)
  return {} unless File.exist?(path)
  info = {}
  CSV.foreach(path, headers: true) do |row|
    source = row['source']&.strip
    next if source.nil? || source.empty?
    info[source] = {
      included: truthy?(row['included']),
      supports_guitar: truthy?(row['supports_guitar']),
      supports_bass: truthy?(row['supports_bass']),
      supports_drums: truthy?(row['supports_drums']),
      supports_vocals: truthy?(row['supports_vocals'])
    }
  end
  info
end

def get_page(charter, year, page_number)
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
  --data-raw '{"instrument":null,"difficulty":"expert","drumType":null,"drumsReviewed":false,"sort":null,"source":"website","name":{"value":"","exact":false,"exclude":false},"artist":{"value":"","exact":false,"exclude":false},"album":{"value":"","exact":false,"exclude":false},"genre":{"value":"","exact":false,"exclude":false},"year":{"value":"#{year}","exact":true,"exclude":false},"charter":{"value":"#{charter}","exact":true,"exclude":false},"minLength":null,"maxLength":null,"minIntensity":null,"maxIntensity":null,"minAverageNPS":null,"maxAverageNPS":null,"minMaxNPS":null,"maxMaxNPS":null,"minYear":null,"maxYear":null,"modifiedAfter":"","hash":"","trackHash":"","hasSoloSections":null,"hasForcedNotes":null,"hasOpenNotes":null,"hasTapNotes":null,"hasLyrics":null,"hasVocals":null,"hasRollLanes":null,"has2xKick":null,"hasIssues":null,"hasVideoBackground":null,"modchart":null,"page":#{page_number}}'
EOS
  JSON.parse(`#{curl}`)['data'] || []
rescue 
  []
end

# Accumulate this into downloaded_songs.csv with normalized fields
rows = []
source_info = load_source_info('source_info.csv')

%w(Harmonix Neversoft).each do |charter|
  (1960..2025).each do |year|
    page_number = 1

    loop do
      page = get_page(charter, year, page_number)
      sleep 0.5
      break if page.empty?
      puts "fetching #{charter}, #{year} page #{page_number} (#{page.length} songs)"
      page.each do |song|
        length_in_seconds = ((song['song_length'] || 0).to_f / 1000).round
        length_str = format("%02d:%02d", length_in_seconds / 60, length_in_seconds % 60)
        next if song['packName'].nil? || song['packName'].empty?
        source_meta = source_info[song['packName']] || {}

        rows << {
          id: song['md5'] || song['id'] || "song-#{rows.length + 1}",
          title: song['name']&.strip,
          artist: song['artist']&.strip,
          album: song['album']&.strip,
          genre: song['genre']&.strip,
          diff_band: song['diff_band'],
          diff_guitar: song['diff_guitar'],
          diff_bass: song['diff_bass'],
          diff_drums: song['diff_drums'],
          diff_vocals: song['diff_vocals'],
          diff_keys: song['diff_keys'],
          diff_guitar_coop: song['diff_guitar_coop'],
          diff_rhythm: song['diff_rhythm'],
          ordering: song['ordering'],
          album_track: song['album_track'],
          playlist_track: song['playlist_track'],
          origin: song['packName'],
          length: length_str,
          seconds: length_in_seconds,
          year: song['year'],
          difficulty: song['diff_band'],
          source_included: source_meta[:included],
          supports_guitar: source_meta[:supports_guitar],
          supports_bass: source_meta[:supports_bass],
          supports_drums: source_meta[:supports_drums],
          supports_vocals: source_meta[:supports_vocals]
        }
      end
      break if page.length < 10
      page_number += 1
    end
  end
end
output = 'downloaded_songs.csv'
CSV.open(output, 'w') do |csv|
  csv << %w[id title artist album genre length seconds year 
            diff_band diff_guitar diff_bass diff_drums diff_vocals diff_keys diff_guitar_coop diff_rhythm 
            ordering album_track playlist_track origin length seconds year difficulty source_included supports_guitar supports_bass supports_drums supports_vocals]
  rows.each do |row|
    csv << [
      row[:id],
      row[:title],
      row[:artist],
      row[:album],
      row[:genre],
      row[:length],
      row[:seconds],
      row[:year],
      row[:diff_band],
      row[:diff_guitar],
      row[:diff_bass],
      row[:diff_drums],
      row[:diff_vocals],
      row[:diff_keys],
      row[:diff_guitar_coop],
      row[:diff_rhythm],
      row[:ordering],
      row[:album_track],
      row[:playlist_track],
      row[:origin],
      row[:length],
      row[:seconds],
      row[:year],
      row[:difficulty],
      row[:source_included],
      row[:supports_guitar],
      row[:supports_bass],
      row[:supports_drums],
      row[:supports_vocals]
    ]
  end
end

puts "Wrote #{rows.length} songs to #{output}"

web_output = File.join('web', 'src', 'data', 'downloaded_songs.csv')

json_output = 'downloaded_songs.json'
File.write(json_output, JSON.pretty_generate(rows))
web_json_output = File.join('web', 'src', 'data', 'downloaded_songs.json')
FileUtils.mkdir_p(File.dirname(web_json_output))
FileUtils.cp(json_output, web_json_output)
puts "Wrote #{json_output} and copied to #{web_json_output}"
