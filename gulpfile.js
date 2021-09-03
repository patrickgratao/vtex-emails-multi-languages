const gulp = require('gulp'),
  sass = require('gulp-sass'),
  data = require('gulp-data'),
  gcmq = require('gulp-group-css-media-queries'),
  gutil = require('gulp-util'),
  juice = require('@akzhan/gulp-juice'),
  j = require('juice'),
  del = require('del'),
  stripComments = require('gulp-strip-comments'),
  connect = require('gulp-connect'),
  path = require('path'),
  hb = require('gulp-hb'),
  injectPartials = require('gulp-inject-partials'),
  remove = require('gulp-email-remove-unused-css'),
  extReplace = require('gulp-ext-replace'),
  replaceName = require('gulp-replace-name')
;(i18n = require('gulp-i18n-localize')),
  (filesToSass = [
    'source/sass/inlined.scss',
    'source/sass/embedded.scss',
    'source/sass/tachyons.scss',
    'source/sass/custom.scss',
  ]),
  (filesToWatch = ['source/sass/**/*.scss', 'source/templates/**/*']),
  (orderJsonToRead = 'vtex')

j.codeBlocks.HBS = {}

// Partials
gulp.task('partials', function (done) {
  'use strict'
  return gulp
    .src('./source/templates/*.hbs')
    .pipe(
      injectPartials({
        removeTags: true,
      })
    )
    .pipe(gulp.dest('./temp'))
    .on('end', done)
})

// i18n
gulp.task('i18n', function (done) {
  'use strict'
  gulp
    .src(['temp/*.hbs'])
    .pipe(
      i18n({
        locales: ['pt-BR', 'en-US', 'es-ES', 'it-IT'],
        localeDir: 'source/locales',
        delimeters: ['((', '))'],
      })
    )
    .pipe(gulp.dest('temp'))
    .on('end', done)
})

// Compile HBS
gulp.task('hbs', function (done) {
  'use strict'
  var hbStream = hb({ bustCache: true })
    // Helpers
    .helpers(require('handlebars-helpers'))
    .helpers('./source/helpers/helpers.js')

  return gulp
    .src('temp/*/*.hbs')
    .pipe(
      data((file) =>
        require(file.path
          .replace(new RegExp('\\temp\\b'), 'source')
          .replace('.hbs', '.json')
          .replace(/[a-z]{2}-[A-Z]{2}/, `data${path.sep}vtex`))
      )
    )
    .pipe(hbStream)
    .pipe(gulp.dest('temp'))
    .on('end', done)
})

// Build SASS
gulp.task('build:sass', function (done) {
  'use strict'

  return gulp
    .src(filesToSass)
    .pipe(
      sass({
        outputStyle: 'compressed',
      }).on('error', gutil.log)
    )
    .pipe(gcmq())
    .pipe(gulp.dest('temp/css/'))
    .on('end', done)
})

// Inline CSS
gulp.task('inline:css', function (done) {
  'use strict'

  return gulp
    .src('temp/*/*.hbs')
    .pipe(
      juice({
        applyHeightAttributes: false,
        applyWidthAttributes: false,
        xmlMode: false,
        // preserveMediaQueries: false,
        webResources: {
          relativeTo: path.resolve(__dirname, 'temp/'),
          images: false,
          svgs: false,
          scripts: false,
          links: false,
        },
      }).on('error', gutil.log)
    )
    .pipe(gulp.dest('temp'))
    .on('end', done)
})

// Clean CSS
gulp.task('clean:css', function (done) {
  'use strict'

  return del(['temp/css/']).then(function () {
    done()
  })
})

// Clean HTML
gulp.task('clean:html', function (done) {
  'use strict'

  return gulp
    .src('temp/*/*.hbs')
    .pipe(
      stripComments({
        safe: true,
        trim: true,
      }).on('error', gutil.log)
    )
    .pipe(gulp.dest('temp'))
    .pipe(connect.reload())
    .on('end', done)
})

// Remove unused CSS
gulp.task('remove-css', function (done) {
  'use strict'
  return gulp
    .src('temp/*/*.hbs')
    .pipe(remove())
    .pipe(gulp.dest('temp'))
    .on('end', done)
})

// Copy data to temp folder
gulp.task('copy-data-to-temp', function (done) {
  'use strict'
  gulp
    .src(['source/data/vtex/*.json'])
    .pipe(gulp.dest('temp/data/vtex'))
    .on('end', done)
})

/** BEGIN - Logic to merge templates with different languages **/
gulp.task('copy-merge-templates', function (done) {
  'use strict'
  gulp
    .src(['source/merge-templates/*.merge.hbs'])
    .pipe(gulp.dest('temp'))
    .on('end', done)
})

gulp.task('apply-partials-merge-templates', function (done) {
  'use strict'
  return gulp
    .src('temp/*.merge.hbs')
    .pipe(injectPartials())
    .pipe(replaceName(/\.merge.hbs/g, '.merged.hbs'))
    .pipe(gulp.dest('./temp/finals'))
    .on('end', done)
})
/** END - Logic to merge templates with different languages **/

// Copy temp to public folder
gulp.task('copy-public', function (done) {
  'use strict'
  gulp
    .src(['temp/*/*.hbs'])
    .pipe(extReplace('.html'))
    .pipe(gulp.dest('public'))
    .on('end', done)
})

// Copy temp to dist folder
gulp.task('copy-dist', function (done) {
  'use strict'
  gulp
    .src(['temp/*/*.hbs'])
    .pipe(extReplace('.html'))
    .pipe(gulp.dest('dist'))
    .on('end', done)
})

// Clean temp folder
gulp.task('clean:temp', function (done) {
  'use strict'
  return del(['temp']).then(function () {
    done()
  })
})

// Clean project folder
gulp.task('clean', function (done) {
  'use strict'

  return del(['public/*']).then(function () {
    done()
  })
})

// Default
gulp.task(
  'default',
  gulp.series([
    'partials',
    'i18n',
    'copy-merge-templates',
    'copy-data-to-temp',
    'hbs',
    'build:sass',
    'apply-partials-merge-templates',
    'inline:css',
    'copy-public',
    'clean:css',
    'clean:temp',
  ])
)

// Default
gulp.task(
  'preview',
  gulp.series([
    'partials',
    'i18n',
    'hbs',
    'build:sass',
    'inline:css',
    'clean:css',
    'remove-css',
    'copy-public',
    'clean:temp',
  ])
)

// Build
gulp.task(
  'dist',
  gulp.series([
    'partials',
    'i18n',
    'copy-merge-templates',
    'build:sass',
    'apply-partials-merge-templates',
    'inline:css',
    'clean:css',
    'clean:html',
    'remove-css',
    'copy-dist',
    'clean:temp',
  ])
)

// Start server w/ live reload
gulp.task('start', function (done) {
  'use strict'

  connect.server({
    port: 8000,
    root: 'public',
    livereload: true,
  })

  done()
})

// Watch
gulp.task('watch', function (done) {
  'use strict'

  gulp.watch(filesToWatch, gulp.series(['default']))

  done()
})

// Development mode
gulp.task('dev', gulp.series(['default', gulp.parallel(['start', 'watch'])]))
