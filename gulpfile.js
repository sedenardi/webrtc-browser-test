const gulp = require('gulp');
const babel = require('gulp-babel');
const eslint = require('gulp-eslint');
const rename = require('gulp-rename');
const terser = require('terser');
const composer = require('gulp-uglify/composer');
const uglify = composer(terser, console);

gulp.task('transpile', () => {
  return gulp.src('./src/webrtc-browser-test.js')
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(babel())
    .pipe(gulp.dest('./lib'));
});

gulp.task('uglify', () => {
  return gulp.src('./lib/webrtc-browser-test.js')
    .pipe(uglify())
    .pipe(rename('webrtc-browser-test.min.js'))
    .pipe(gulp.dest('./lib'));
});

gulp.task('build', gulp.series(
  'transpile',
  'uglify'
));

gulp.task('default', gulp.series('build'));

gulp.task('watchSrc', () => {
  return gulp.watch('src/**/*', gulp.series('build'));
});

gulp.task('watch', gulp.series(
  'build',
  'watchSrc'
));
