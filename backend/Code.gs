const SHEET_DATA = "Data";
const SHEET_CONFIG = "Config";
const SHEET_MASTER = "MasterData";

function doOptions(e) {
  return HtmlService.createHtmlOutput("")
}

function doGet(e) {
  if (e.parameter.action === 'getMasterData') {
    return getMasterData();
  }
  return ContentService.createTextOutput("Valid Endpoint. Action not specified.").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const token = postData.token;
    
    // 1. Validate Token and Get Email
    const email = verifyGoogleToken(token);
    if (!email) {
      return makeResponse({ status: "error", message: "Invalid or expired token. Unauthorized." }, 401);
    }
    
    const formData = postData.formData;
    
    // 2. Upload files if exist
    let folderPdfId = getConfigValue('FolderID_Dokumen');
    let folderExcelId = getConfigValue('FolderID_Lampiran');
    
    let pdfUrl = "";
    let excelUrl = "";
    
    if (formData.filePdf && formData.filePdf.base64) {
      pdfUrl = uploadFileToDrive(formData.filePdf, folderPdfId);
    }
    
    if (formData.fileExcel && formData.fileExcel.base64) {
      excelUrl = uploadFileToDrive(formData.fileExcel, folderExcelId);
    }
    
    // 3. Save to Sheet Data
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetData = ss.getSheetByName(SHEET_DATA);
    
    if(!sheetData) {
       // Auto-create if not exists
       sheetData = ss.insertSheet(SHEET_DATA);
       sheetData.appendRow(["Timestamp", "Email Address", "Klien", "Status", "Cabang", "Posisi", "Jumlah Kebutuhan", "Deskripsi Pekerjaan", "Kompetensi", "Link Dokumen Permintaan User", "Link Lampiran Remunerasi", "OSM"]);
    }
    
    const timestamp = new Date();
    
    const rowData = [
      timestamp,
      email,
      formData.klien || "",
      formData.status || "",
      formData.cabang || "",
      formData.posisi || "",
      formData.jumlahKebutuhan || "",
      formData.deskripsiPekerjaan || "",
      (formData.kompetensi || []).join(", "),
      pdfUrl,
      excelUrl,
      formData.osm || ""
    ];
    
    sheetData.appendRow(rowData);
    
    // 4. Send Email Summary
    sendSummaryEmail(email, formData, pdfUrl, excelUrl);
    
    return makeResponse({ status: "success", message: "Data berhasil disimpan" });
    
  } catch (error) {
    return makeResponse({ status: "error", message: error.toString() });
  }
}

function verifyGoogleToken(token) {
  if (!token) return null;
  try {
    // Validate the JWT Token with Google's public endpoint
    const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + token, {
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const tokenInfo = JSON.parse(response.getContentText());
      return tokenInfo.email;
    }
    return null;
  } catch (e) {
    return null;
  }
}

function uploadFileToDrive(fileObj, folderId) {
  if (!folderId) throw new Error("Folder ID tidak dikonfigurasi.");
  try {
    const folder = DriveApp.getFolderById(folderId);
    const contentType = fileObj.mimeType;
    const splitBase = fileObj.base64.split(',');
    const base64Data = splitBase.length > 1 ? splitBase[1] : splitBase[0];
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, fileObj.filename);
    const file = folder.createFile(blob);
    return file.getUrl();
  } catch(e) {
    throw new Error("Gagal upload file: " + e.message);
  }
}

function getMasterData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_MASTER);
  if (!sheet) return makeResponse({ status: "success", data: { Klien: [], Cabang: [], Kompetensi: [], OSM: [] }, message: "Sheet MasterData tidak ditemukan, menghasilkan list kosong." });
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return makeResponse({ status: "success", data: { Klien: [], Cabang: [], Kompetensi: [], OSM: [] } });
  
  const headers = data[0];
  const result = {
    Klien: [],
    Cabang: [],
    Kompetensi: [],
    OSM: []
  };
  
  const idxKlien = headers.indexOf('Klien');
  const idxCabang = headers.indexOf('Cabang');
  const idxKompetensi = headers.indexOf('Kompetensi');
  const idxOSM = headers.indexOf('OSM');
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (idxKlien > -1 && row[idxKlien]) {
        if(!result.Klien.includes(row[idxKlien])) result.Klien.push(row[idxKlien]);
    }
    if (idxCabang > -1 && row[idxCabang]) {
        if(!result.Cabang.includes(row[idxCabang])) result.Cabang.push(row[idxCabang]);
    }
    if (idxKompetensi > -1 && row[idxKompetensi]) {
        if(!result.Kompetensi.includes(row[idxKompetensi])) result.Kompetensi.push(row[idxKompetensi]);
    }
    if (idxOSM > -1 && row[idxOSM]) {
        if(!result.OSM.includes(row[idxOSM])) result.OSM.push(row[idxOSM]);
    }
  }
  
  return makeResponse({ status: "success", data: result });
}

function getConfigValue(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CONFIG);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

function sendSummaryEmail(email, formData, pdfUrl, excelUrl) {
  const subject = "Summary Permintaan Job Order: " + formData.posisi;
  let body = "Halo,\n\nBerikut adalah summary dari permintaan Job Order yang baru saja Anda submit:\n\n";
  body += "Klien: " + (formData.klien || "-") + "\n";
  body += "Status: " + (formData.status || "-") + "\n";
  body += "Cabang: " + (formData.cabang || "-") + "\n";
  body += "Posisi: " + (formData.posisi || "-") + "\n";
  body += "Jumlah Kebutuhan: " + (formData.jumlahKebutuhan || "-") + "\n";
  body += "Deskripsi Pekerjaan: \n" + (formData.deskripsiPekerjaan || "-") + "\n\n";
  body += "Kompetensi: " + ((formData.kompetensi || []).join(", ") || "-") + "\n";
  body += "OSM: " + (formData.osm || "-") + "\n\n";
  
  let htmlBody = body.replace(/\n/g, "<br>");
  
  if (pdfUrl) {
    body += "Dokumen PDF: " + pdfUrl + "\n";
    htmlBody += `Dokumen PDF: <a href="${pdfUrl}">Lihat Dokumen</a><br>`;
  }
  if (excelUrl) {
    body += "Dokumen Excel: " + excelUrl + "\n";
    htmlBody += `Dokumen Excel: <a href="${excelUrl}">Lihat Excel</a><br>`;
  }
  body += "\nTerima kasih.";
  htmlBody += "<br>Terima kasih.";
  
  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body,
    htmlBody: htmlBody
  });
}

function makeResponse(content) {
  return ContentService.createTextOutput(JSON.stringify(content)).setMimeType(ContentService.MimeType.JSON);
}
