"use strict";

/** {Array<EventRecord>} 用來放 EventRecord，最後所有日曆事件資料都在此陣列內 */
let eventRecords = [];

/** The right side of the page to print the first N event calendar */
const MAX_SHOW_RECORD = 100;

const KEY_WORDS = {
  DELIMITATORS: ['BEGIN:VEVENT', 'END:VEVENT', 'BEGIN:VALARM', 'END:VALARM'],
	/**The beginning of the field to read from the ICS file */
  WORDS: ['DTSTART', 'DTEND', 'SUMMARY', 'DESCRIPTION', 'LOCATION'],
  END_DESCR:['LOCATION', 'X-ALT-DESC'],
  /**Corresponding to the beginning of the string, this is "the field from the first few characters to start cutting substring」 */
  SUBSTRING: [8, 6, 8, 12, 9]
};

function CleanString(text)
{
	return text.trim().replace(/\\\,/g, ',').replace(/\\\;/g, ';').replace(/\\n/g, '<br>');  
}

/** EventRecord 物件用來放單一日曆事件 */
class EventRecord {
  constructor(start, end, title, location, description) {
    this.start = start;
    this.end = end;
    this.title = CleanString(title);
	this.location = CleanString(location);
   	this.description = CleanString(description)
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
    $('#div_result_file_name').append('<strong>File name：' + INPUT_FILE.name + '</strong>');

    let fileReader = new FileReader();
    fileReader.readAsText(INPUT_FILE);
    fileReader.onload = function() {
      eventRecords = [];
      parse(fileReader.result.split('\n'));
      //sortResult();
      printResult();
      createDownloadableContent();
    };
  });
});


/**
 * Will be read into the ICS file resolution, compared with KEY_WORDS whether we are interested in the field, put it in the field of temporary array.
 * @param  {Array<string>} input [讀入之字串陣列]
 */
/*function parseOld(input) {
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
*/
function parse(input) {
	let tempArray = [];
	var OUTSIDE=0;
	var EVENT=1;
	var ALARM=2;
	var DESCR=3;
	var state=OUTSIDE;
	for (let i = 0; i < input.length; i++){
		if (state==OUTSIDE && input[i].match('^BEGIN:VEVENT'))
			{
				state=EVENT;
			}
		else if(state==DESCR){
			if (input[i].match('^' + KEY_WORDS.END_DESCR[0]) || input[i].match('^' + KEY_WORDS.END_DESCR[1])){
				state=EVENT;
			}
			else{
				tempArray[3]+=input[i];
			}
		}
		if (state==EVENT)
			{
				if (input[i].match('^BEGIN:VALARM')){
					state=ALARM;
				}
			
				else if(input[i].match('^END:VEVENT')){
					state=OUTSIDE;
					handleEventRecord(tempArray);
					console.log(tempArray)
					tempArray = [];
				}
				else {
					for (let j=0; j<KEY_WORDS.WORDS.length; j++){
						if (input[i].match('^' + KEY_WORDS.WORDS[j])){
							if (input[i].match('^' + KEY_WORDS.WORDS[3])){
								state=DESCR;
							}
					 		tempArray[j] = input[i].substring(KEY_WORDS.SUBSTRING[j]);
							
				 		}
					}
				}
			}
		if (state==ALARM && input[i].match('^END:VALARM'))
			{
				state=EVENT;
			}
	}
}


function fixDate (badDate){
	if (badDate.match('^TZID')){
		var d = new Date();
		var tempDate=badDate.split(":").pop();
		d.setFullYear(tempDate.substring(0,4));
		d.setMonth(tempDate.substring(4,6));
		d.setDate(tempDate.substring(6,8));
		d.setHours(tempDate.substring(9,11));
		d.setMinutes(tempDate.substring(11,13));
		d.setSeconds(0);
		
		
		//Date=day+"/"+month+"/"+year+" "+hour+":"+minute;
		console.log(d.toLocaleString());
		return d;
	
	}
	else{
		var tempDate=badDate;
		var d = new Date();
		d.setFullYear(tempDate.substring(0,4));
		d.setMonth(tempDate.substring(4,6));
		d.setDate(tempDate.substring(6,8));
		d.setHours(0);
		d.setMinutes(0);
		d.setSeconds(0);
		return d;
		
		/*var tempDate=badDate;
		var year=tempDate.substring(0,4);
		var month=tempDate.substring(4,6);
		var day=tempDate.substring(6,8);
		Date=day+"/"+month+"/"+year;
		return badDate;*/
	}
}

/**
 * 將暫存之欄位陣列再次做檢查後，存入最終的 eventRecords 陣列中。
 * @param  {Array<string>} arr [暫存之欄位陣列]
 */
function handleEventRecord(arr) {
  /** If a calendar event is an "all day" event, its time format is not the same as "a few points" and needs to be cut*/
  if (arr[1].match('^VALUE')) {
    arr[1] = arr[1].substring(11);
  }
  if (arr[0].match('^VALUE')) {
    arr[0] = arr[0].substring(11);
  }
	for (let k=0; k<KEY_WORDS.WORDS.length; k++){
		console.log(k ,typeof arr[k]);
		if("undefined" === typeof arr[k]){
			debugger;
			arr[k]="campo vuoto";
		}
	}
	 
	arr[0]=fixDate (arr[0]);
	arr[1]=fixDate (arr[1]);
	
  eventRecords.push(new EventRecord(arr[0], arr[1], arr[2], arr[4], arr[3]));
}


function sortResult() {
  eventRecords.sort(function(a, b) {
    return a.start.getTime() - b.start.getTime();
  });
}

function printResult() {
  let str = '';
  str += '<table id="table_result" class="table table-condensed table-bordered table-stripped"><tr>';
  str += '<th>#</th>';
  str += '<th>Data inizio</th>';
  str += '<th>Data fine</th>';
  str += '<th>Nome evento</th>';
  str += '<th>Luogo</th>';
  str += '<th>Descrizione</th>';
  str += '</tr></table>';
  $("#div_result_table").append(str);

  const _printLength = eventRecords.length > MAX_SHOW_RECORD ? MAX_SHOW_RECORD : eventRecords.length;
  for (let i = 0; i < _printLength; i++) {
    let str = '';
    str += '<tr>';
    str += '<td>' + i + '</td>';
    str += '<td>' + eventRecords[i].start.toLocaleString() + '</td>';
    str += '<td>' + eventRecords[i].end.toLocaleString() + '</td>';
    str += '<td>' + eventRecords[i].title + '</td>';
	str += '<td>' + eventRecords[i].location + '</td>';
	str += '<td>' + eventRecords[i].description + '</td>';
    str += '</tr>';
    $("#table_result").append(str);
  }
}


function createDownloadableContent() {
  let content = '#,Inizio,Fine,Titolo,Luogo,Descrizione\n';
  for (let i = 0; i < eventRecords.length; i++) {
    content += i + 1 + ',';
    content += eventRecords[i].start.toLocaleString() + ',';
    content += eventRecords[i].end.toLocaleString() + ',';
    content += eventRecords[i].title + ',';
	content += eventRecords[i].location + ',';
	content += eventRecords[i].description + ',';
    content += "\n";
  }

  const fileName = 'Google_calendar' + getDateTime() + '.csv';
  const buttonDownload = '<a ' +
    'id="button_download" ' +
    'class="btn btn-lg btn-block btn-success" ' +
    'href="' + getblobUrl(content) + '" ' +
    'download="' + fileName + '" ' +
    '>Download CSV</a>';
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
  // 而我們想要的是 20141101_210702 才對
  const _DATE = new Date();
  const DATE_TIME = String(_DATE.getFullYear() + fixOneDigit((_DATE.getMonth() + 1)) + fixOneDigit(_DATE.getDate()) + "_" + fixOneDigit(_DATE.getHours()) + fixOneDigit(_DATE.getMinutes()) + fixOneDigit(_DATE.getSeconds()));
  return DATE_TIME;
}

function fixOneDigit(x) {
  return x < 10 ? ("0" + x) : x;
}
