function listFiles(/* repoId, options */) {
  throw new Error('TODO: implement file listing');
}

function uploadFile(/* repoId, payload */) {
  throw new Error('TODO: implement file upload');
}

function listAllFilesForAdmin(/* options */) {
  throw new Error('TODO: implement admin file listing');
}

module.exports = {
  listFiles,
  uploadFile,
  listAllFilesForAdmin,
};
