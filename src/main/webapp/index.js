"use strict";

/** {Array<EventRecord>} Stores the EventRecord that contains all the events information. */
let eventRecords = [];

/** The right side of the page to print the first N event calendar */
const MAX_SHOW_RECORD = 100;

const KEY_WORDS = {
  /** The beginning of the field to read from the ICS file */
  WORDS: ['BEGIN:VEVENT', 'DTSTART', 'DTEND', 'DESCRIPTION', 'LOCATION', 'SUMMARY', 'END:VEVENT'],
  /** Corresponding to the beginning of the string, this is "the field from the first few characters to start cutting substring */
  SUBSTRING: [0, 8, 6, 12, 9, 8, 0]
};

/** EventRecord Object where to place a single calendar event */
class EventRecord {
  constructor(start, end, description, location, summary) {
    this.start = start.trim();
    this.end = end.trim();
    this.description = description;
    this.location = location.trim().replace(/\\,/g, '，');
    this.summary = summary.trim().replace(/\\,/g, '，');
  }
}


$(function() {
  $('#input_file').change(function(e) {
    $('#div_download').empty();
    $('#div_result_file_name').empty();
    $('#div_result_table').empty();

    const INPUT_FILE = e.target.files[0];
    if (INPUT_FILE === null) {
      return;
    }
    $('#div_result_file_name').append('File name:' + INPUT_FILE.name + '<hr/>');

    let fileReader = new FileReader();
    fileReader.readAsText(INPUT_FILE);
    fileReader.onload = function() {
      eventRecords = [];
      parse(fileReader.result.split('\n'));
      sortResult();
      printResult();
      createDownloadableContent();
    };
  });
});


/**
 * Will be read into the ICS file resolution, compared with KEY_WORDS whether we are interested in the field, put it in the field of temporary array.
 * @param  {Array<string>} input [the string array readed]
 */
function parse(input) {
  let _keywordIndex = 0;
  let tempArray = [];
  for (let i = 0; i < input.length; i++) {
    if (input[i].match('^' + KEY_WORDS.WORDS[_keywordIndex])) {
      tempArray[_keywordIndex] = input[i].substring(KEY_WORDS.SUBSTRING[_keywordIndex]);
      _keywordIndex++;

      if (_keywordIndex === KEY_WORDS.WORDS.length) {
        handleEventRecord(tempArray);
        _keywordIndex = 0;
        tempArray = [];
      }
    }
  }
}

/**
 * The array of temporary fields is checked again and stored in the final EventRecords array.
 * @param  {Array<string>} arr [Temporary array of fields]
 */
function handleEventRecord(arr) {
  /** If a calendar event is an "all day" event, its time format is not the same as "a few points" and needs to be cut */
  if (arr[1].match('^VALUE')) {
    arr[1] = arr[1].substring(11);
  }
  if (arr[2].match('^VALUE')) {
    arr[2] = arr[2].substring(11);
  }
  eventRecords.push(new EventRecord(arr[1], arr[2], arr[3], arr[4], arr[5]));
}


function sortResult() {
  eventRecords.sort(function(a, b) {
    return a.start.substr(0, 8) - b.start.substr(0, 8);
  });
}

function printResult() {
  let str = '';
  str += '<table id="table_result" class="table table-condensed table-bordered table-stripped"><tr>';
  str += '<th>#</th>';
  str += '<th>Início</th>';
  str += '<th>Fim</th>';
  str += '<th>Sumário</th>';
  str += '<th>Local</th>';
  str += '<th>Descrição</th>';
  str += '</tr></table>';
  $("#div_result_table").append(str);

  const _printLength = eventRecords.length > MAX_SHOW_RECORD ? MAX_SHOW_RECORD : eventRecords.length;
  for (let i = 0; i < _printLength; i++) {
    let str = '';
    str += '<tr>';
    str += '<td>' + i + '</td>';
    str += '<td>' + eventRecords[i].start + '</td>';
    str += '<td>' + eventRecords[i].end + '</td>';
    str += '<td>' + eventRecords[i].summary + '</td>';
    str += '<td>' + eventRecords[i].location + '</td>';
	str += '<td>' + eventRecords[i].description + '</td>';
    str += '</tr>';
    $("#table_result").append(str);
  }
}


function createDownloadableContent() {
  let content = '#, start, end, summary, location, description \n';
  for (let i = 0; i < eventRecords.length; i++) {
    content += i + 1 + ',';
    content += eventRecords[i].start + ',';
    content += eventRecords[i].end + ',';
    content += eventRecords[i].summary + ',';
    content += eventRecords[i].location + ',';
	content += eventRecords[i].description + ',';
    content += "\n";
  }

  const fileName = 'Google_calendar' + getDateTime() + '.csv';
  const buttonDownload = '<a ' +
    'id="button_download" ' +
    'class="btn btn-block btn-lg btn-success" ' +
    'href="' + getblobUrl(content) + '" ' +
    'download="' + fileName + '" ' +
    '>Downlod the CSV file</a>';
  $("#div_download").append(buttonDownload);
}


//////////////////////
// Helper Functions //
//////////////////////

function getblobUrl(content) {
  const _MIME_TYPE = 'text/plain';
  const _UTF8_BOM = '\uFEFF';
  const blob = new Blob([_UTF8_BOM + content], {
    type: _MIME_TYPE
  });
  return window.URL.createObjectURL(blob);
}

function getDateTime() {
  // 如果現在時間是 2014/11/1, 21:07, 02 會得到 2014111_2172
  // If the time is 2014/11/1, 21:07, 02 will get 2014111_2172
  // 而我們想要的是 20141101_210702 才對
  // And we want is 20141101_210702 fishes :-/
  const _DATE = new Date();
  const DATE_TIME = String(_DATE.getFullYear() + fixOneDigit((_DATE.getMonth() + 1)) + fixOneDigit(_DATE.getDate()) + "_" + fixOneDigit(_DATE.getHours()) + fixOneDigit(_DATE.getMinutes()) + fixOneDigit(_DATE.getSeconds()));
  return DATE_TIME;
}

function fixOneDigit(x) {
  return x < 10 ? ("0" + x) : x;
}
