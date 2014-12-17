var jsdom = require("jsdom");
var fs = require("fs");
var jquery = fs.readFileSync("./jquery.js", "utf-8");
var request = require("request");

var LOGIN_URL = 'https://central.carleton.ca/prod/twbkwbis.P_ValLogin';
var VIEW_GRADE_URL = 'https://central.carleton.ca/prod/bwskogrd.P_ViewGrde';
var WINTER_2014_TERM = '201410';
var FALL_2014_TERM = '201430';

var j = request.jar();
request = request.defaults({ jar: j });
// trick carleton into thinking we are a browser that saves cookies
j.setCookie(request.cookie('TESTID=set;'), LOGIN_URL);

var STUDENT_NUMBER = process.env.CARLETON_STUDENT_NUMBER;
var PIN_NUMBER = process.env.CARLETON_PIN;

var readline = require('readline');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function getStudentNumber(callback) {
  rl.question("Enter your Carleton Student Number: ", function(number) {
    STUDENT_NUMBER = number;
    callback();
  });
}

function getPinNumber(callback) {
  rl.question("Enter your Carleton Central PIN (not stored): ", function(pin) {
    PIN_NUMBER = pin;
    callback();
  });
}

if(!STUDENT_NUMBER) {
  getStudentNumber(function() {
    getPinNumber(function() {
      getGrades();
      rl.close();
    });
  });
} else if(!PIN_NUMBER) {
  getPinNumber(function() {
    getGrades();
    rl.close();
  });
} else {
  getGrades();
  rl.close();
}

function getGrades() {
  request.post({
    url: LOGIN_URL,
    form: {
      'sid': STUDENT_NUMBER,
      'PIN': PIN_NUMBER
    }},
    function(err, resp, body) {
      request.post({ url: VIEW_GRADE_URL, form:{ 'term_in': FALL_2014_TERM } }, function (err, resp) {
        parseGradeHTML(resp.body);
      });
    }
  );
}

function parseGradeHTML(html) {
  jsdom.env({
    html: html,
    src: [jquery],
    done: function (errors, window) {
      var $ = window.$;
      var title = $("title").text();

      if(title === 'User Login') {
        console.log('Your login failed. Please check your login credentials.');
      } else {
        var count = 0;

        var gradeTable = $($("table.datadisplaytable")[1]);
        var outputString = "";
         gradeTable.find("td.dddefault").each(function () {
          var countmod = (count % 11);
          switch(countmod) {
            case 0: {
              break;
            }
            case 1: {
              // dept: e.g. SYSC, ELEC
              outputString += $.trim($(this).text());
              break;
            }
            case 2: {
              // code: e.g. 1001, 2003
              outputString += " " + $.trim($(this).text());
              break;
            }
            case 3: {
              // section value: e.g. A, B
              break;
            }
            case 4: {
              // course description: e.g. Programming Languages
              outputString += " (" + $.trim($(this).text()) + ")";
              break;
            }
            case 5: {
              // location: e.g. Main Campus
              break;
            }
            case 6: {
              // grade: e.g. A, A+, A-
              outputString += " Grade: " + $.trim($(this).text());
              break;
            }
            case 7: {
              // attempted
              break;
            }
            case 8: {
              // earned e.g. 0.5
              break;
            }
            case 9: {
              // gpa hours e.g. 0.5
              break;
            }
            case 10: {
              // quality points e.g. 6.0 for A+, 5.0 for A-
              console.log(outputString);
              outputString = '';
              break;
            }
          }
          count++;
        });
      }
    }
  });
}
