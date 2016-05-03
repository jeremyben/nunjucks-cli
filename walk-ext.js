var fs = require('fs')
var path = require('path')

var walkExt = function (dir, ext, filelist) {
  var files = fs.readdirSync(dir)
  filelist = filelist || []
  dir = dir || '.'
  files.forEach(function(file) {
    if (fs.statSync(dir + '/' + file).isDirectory()) {
      filelist = walkExt(dir + '/' + file + '/', ext, filelist)
    } else {
      // Sort files to not render partials starting by _
      if (path.extname(file) === ext && path.basename(file).indexOf('_') !== 0) filelist.push(file)
    }
  })
  return filelist
}

module.exports = walkExt