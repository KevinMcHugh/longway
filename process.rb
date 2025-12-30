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

def process_csv(input_csv, output_json, web_json)
  unless File.exist?(input_csv)
    warn "Missing #{input_csv}; run fetch.rb first."
    return
  end

  source_info = load_source_info('source_info.csv')
  rows = []
  CSV.foreach(input_csv, headers: true) do |row|
    origin = row['origin']
    source_meta = source_info[origin] || {}
    rows << {
      id: row['id'],
      title: row['title'],
      artist: row['artist'],
      album: row['album'],
      genre: row['genre'],
      diff_band: row['diff_band'],
      diff_guitar: row['diff_guitar'],
      diff_bass: row['diff_bass'],
      diff_drums: row['diff_drums'],
      diff_vocals: row['diff_vocals'],
      diff_keys: row['diff_keys'],
      diff_guitar_coop: row['diff_guitar_coop'],
      diff_rhythm: row['diff_rhythm'],
      ordering: row['ordering'],
      album_track: row['album_track'],
      playlist_track: row['playlist_track'],
      origin: origin,
      length: row['length'],
      seconds: row['seconds'].to_i,
      year: row['year'].to_i,
      difficulty: row['difficulty'] || row['diff_band'],
      source_included: source_meta[:included],
      supports_guitar: source_meta[:supports_guitar],
      supports_bass: source_meta[:supports_bass],
      supports_drums: source_meta[:supports_drums],
      supports_vocals: source_meta[:supports_vocals]
    }
  end

  File.write(output_json, JSON.pretty_generate(rows))
  FileUtils.mkdir_p(File.dirname(web_json))
  FileUtils.cp(output_json, web_json)
  puts "Processed #{rows.length} rows from #{input_csv} into #{output_json} (copied to #{web_json})"
end

if $PROGRAM_NAME == __FILE__
  process_csv('downloaded_songs.csv', 'downloaded_songs.json', File.join('web', 'src', 'data', 'downloaded_songs.json'))
end
