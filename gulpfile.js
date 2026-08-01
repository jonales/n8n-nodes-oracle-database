const path = require('path');

const { task, src, dest, series } = require('gulp');

task('build:icons', copyIcons);
task('build:vendor', copyVendor);
task('build:complete', series(copyIcons, copyVendor));

function copyIcons() {
  const nodeSource = path.resolve('nodes', '**', '*.{png,svg}');
  const nodeDestination = path.resolve('dist', 'nodes');
  src(nodeSource).pipe(dest(nodeDestination));

  const credSource = path.resolve('credentials', '**', '*.{png,svg}');
  const credDestination = path.resolve('dist', 'credentials');

  return src(credSource).pipe(dest(credDestination));
}

function copyVendor(cb) {
	const vendorSource = path.resolve('nodes', 'Oracle', 'vendor', '**', '*');
	const vendorDestination = path.resolve('dist', 'nodes', 'Oracle', 'vendor');
	console.log(`--- Copying vendored assets from ${vendorSource} to ${vendorDestination} ---`);
	src(vendorSource).pipe(dest(vendorDestination));
	cb();
}

function buildComplete() {
	// This function is kept for compatibility but the main logic is in the series
	return series(copyIcons, copyVendor);
}