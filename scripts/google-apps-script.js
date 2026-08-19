/**
 * Google Apps Script — paste this into a Google Sheet's script editor.
 *
 * Setup:
 *   1. Create a new Google Sheet (this will be your order book)
 *   2. Name the first sheet "Orders"
 *   3. Add headers in row 1:  Timestamp | Name | Service | Date | Status
 *   4. Go to Extensions > Apps Script
 *   5. Delete any code there and paste this entire file
 *   6. Click Deploy > New deployment
 *   7. Type = Web app
 *   8. Execute as = Me
 *   9. Who has access = Anyone
 *  10. Click Deploy and copy the URL
 *  11. Paste that URL into your client JSON as booking.sheetUrl
 */

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.setName('Orders');
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Name', 'Service', 'Date', 'Status']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }

  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Invalid JSON' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var timestamp = data.timestamp
    ? new Date(data.timestamp)
    : new Date();

  sheet.appendRow([
    timestamp,
    data.name || '',
    data.service || '',
    data.date || '',
    'New'
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService
    .createTextOutput('Booking endpoint is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}
