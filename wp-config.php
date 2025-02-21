<?php
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the
 * installation. You don't have to use the web site, you can
 * copy this file to "wp-config.php" and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * MySQL settings
 * * Secret keys
 * * Database table prefix
 * * ABSPATH
 *
 * @link https://codex.wordpress.org/Editing_wp-config.php
 *
 * @package WordPress
 */

// ** MySQL settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define('DB_NAME', 'vi20_cfabogados');

/** MySQL database username */
define('DB_USER', 'vi20_cfabogados');

/** MySQL database password */
define('DB_PASSWORD', '1713808300');

/** MySQL hostname */
define('DB_HOST', 'db.localhost.net.ar');

/** Database Charset to use in creating database tables. */
define('DB_CHARSET', 'utf8');

/** The Database Collate type. Don't change this if in doubt. */
define('DB_COLLATE', '');

/**#@+
 * Authentication Unique Keys and Salts.
 *
 * Change these to different unique phrases!
 * You can generate these using the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}
 * You can change these at any point in time to invalidate all existing cookies. This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define('AUTH_KEY',         '*Ad]8/.sX>F*Ug-_3gGX[fHd`0.m72?R?5nhn|o@@Wrn9Kva~xppDBek=S+Byz|K');
define('SECURE_AUTH_KEY',  'h(2;a;H9QBzliO.SyjAkI_{;]1?l[~cDz5KP6b.&nz-am_5^B}%!Ua5/Y{sF{pB=');
define('LOGGED_IN_KEY',    'uOc0&K/EM%a[f O=rt_Us4?7gc.u[HEvra4#`Sz7|sgYXngyW`}b..%+ |ivWUdJ');
define('NONCE_KEY',        '6^a;}syTk9A kgW{8OKGqsEFgdiLfEle{wL9HiX`pJ7_oxTe-h0$/-2flN@rJ&:M');
define('AUTH_SALT',        'Xl+j}2gAF?G4{Yteh#3W2]~+<bsP<eY@{My4J?l[LO9@4ngEf~[I#b~R557M:(q`');
define('SECURE_AUTH_SALT', 'w*?QuA:M4FB1:Bu +]MH9Fv4!F=R(&+o_l}FfR;:hs:.@HX PcDKsK$},,HUL3DI');
define('LOGGED_IN_SALT',   'a$<{O^;HlIS)Uk?l:K([/Bn6qx5&FHIKem?qFKgc,3?iuNGR)4tsf^qfjnxR4Q!%');
define('NONCE_SALT',       'H).3{Oi-t[T&<f}NXTR-o_)X}K_Fji/u>?U@Y@&?uPPh.s!}Gyol/X|S] |{WRhB');

/**#@-*/

/**
 * WordPress Database Table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix  = 'webamk_';

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the Codex.
 *
 * @link https://codex.wordpress.org/Debugging_in_WordPress
 */
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
@ini_set('display_errors', 0);

/* That's all, stop editing! Happy blogging. */

/** Absolute path to the WordPress directory. */
if ( !defined('ABSPATH') )
	define('ABSPATH', dirname(__FILE__) . '/');

/** Sets up WordPress vars and included files. */
require_once(ABSPATH . 'wp-settings.php');



