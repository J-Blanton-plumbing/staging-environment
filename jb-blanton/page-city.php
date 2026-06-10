<?php
/**
 * Template Name: City Page
 * Template for city overview pages (top-level, no parent).
 */

get_header();

if ( have_posts() ) : while ( have_posts() ) : the_post();

$post_id  = get_the_ID();
$slug     = get_post_field( 'post_name', $post_id );

// ─── ACF data fields ──────────────────────────────────────────────────────────
$geo      = get_field( 'city_name' )    ?: get_the_title();
$gbp      = get_field( 'gbp' )          ?: $geo;
$callout     = get_field( 'city_callout' )    ?: '';
$city_content = get_field( 'city_content' )   ?: '';
$service      = get_field( 'city_service' )   ?: '';
$page_title_field = get_field( 'city_page_title' ) ?: '';

// H1: "{Geo} Plumber" for city overview — matches production Go template
$h1 = get_field( 'h1_override' ) ?: ( $geo . ' Plumber' );

// ─── Hero image logic (mirrors Go template) ───────────────────────────────────
$cf = 'https://d1rplazj5a80fb.cloudfront.net/images/';
$raw_img = get_field( 'category_image' ) ?: get_field( 'hero_image' ) ?: '';
if ( empty( $raw_img ) || strpos( $raw_img, 'vid_' ) !== false ) {
	$hero_src = $cf . 'hero_image.webp';
} elseif ( strpos( $raw_img, 'wp-content' ) !== false ) {
	// Extract path after jblantonplumbing.com/wp-content (handles shortpixel URLs too)
	$parts = explode( 'wp-content', $raw_img );
	$hero_src = $cf . 'wp-content' . end( $parts );
} elseif ( strpos( $raw_img, 'http' ) === 0 ) {
	$hero_src = $raw_img;
} else {
	// Plain filename slug → CloudFront .webp
	$hero_src = $cf . ltrim( $raw_img, '/' ) . ( strpos( $raw_img, '.' ) === false ? '.webp' : '' );
}

// ─── Elfsight IDs ─────────────────────────────────────────────────────────────
$elfsight_hero_id    = get_field( 'elfsight_reviews_id' ) ?: jb_get_elfsight_ids( $slug );
$elfsight_content_map = [
	'algonquin'         => '8a4401fa-c2fb-411e-9bf3-8e691c1a9d5b',
	'arlington-heights' => '63cfff20-7624-4c5b-9d7a-1ee39d90d602',
	'elgin'             => '54f95d6e-ce23-49c6-b3ac-8e4234199072',
	'hinsdale'          => '6a7311e8-5c7b-427d-9517-2a73c6b64d6c',
	'mchenry'           => 'ce2757ba-58d8-43ec-8e87-5003099a592c',
	'naperville'        => '53445308-2ca6-49c1-ac47-da5c3a6401f6',
	'northbrook'        => '37a7d292-8861-4ea3-9680-c342123c50bc',
	'geneva'            => 'e082be80-78f3-407c-aaba-6cc5442c12ad',
];
$elfsight_content_id = $elfsight_content_map[ $slug ] ?? '67911321-4b72-4209-b157-fc9812eadd3b';

// ─── NAP data ─────────────────────────────────────────────────────────────────
// Office URLs / addresses keyed by city slug
$_mchenry   = [ 'url' => 'https://maps.app.goo.gl/DQ4fP5QXZr7TpBJ48', 'address' => '3406 W Elm St, Mchenry, IL 60050' ];
$_elgin     = [ 'url' => 'https://maps.app.goo.gl/5J1K7ZVgFeNwy8VJ8', 'address' => '964 N McLean Blvd, Elgin, IL 60123-2039' ];
$_arh       = [ 'url' => 'https://maps.app.goo.gl/Qq4qPYJT8bCgash26', 'address' => '1204 E. Central Road, Suite 3, Arlington Heights, IL 60005' ];
$_nbrook    = [ 'url' => 'https://maps.app.goo.gl/pCmmYeescW7Mf6B2A', 'address' => '1945 Techny Road, #11, Northbrook, IL 60062' ];
$_hinsdale  = [ 'url' => 'https://maps.app.goo.gl/UfWAoTRbWkAPR6WYA', 'address' => '15 Spinning Wheel Rd #216a, Hinsdale, IL 60521' ];
$_naperville= [ 'url' => 'https://maps.app.goo.gl/9ou5MAtuAMjG6XfN8', 'address' => '200 S Main Street, Suite 3, Naperville, IL 60540' ];
$_evanston  = [ 'url' => 'https://maps.app.goo.gl/rqmTxHMcicWhz1yV7', 'address' => '1603 Orrington Ave #600-1085, Evanston, IL 60201' ];
$nap_map = [
	// ── Special / own-address offices ──
	'algonquin'            => [ 'url' => 'https://maps.app.goo.gl/egVEqHQJkzFG8Qo56', 'address' => '2390 Esplanade Dr #200f, Algonquin, IL 60102' ],
	'arlington-heights'    => $_arh,
	'elgin'                => $_elgin,
	'evanston'             => $_evanston,
	'hinsdale'             => $_hinsdale,
	'mchenry'              => $_mchenry,
	'naperville'           => $_naperville,
	'northbrook'           => $_nbrook,
	'geneva'               => [ 'url' => 'https://maps.app.goo.gl/mfdpSC3BSGkQKdQ39', 'address' => '115 Campbell St #201C, Geneva, IL 60134' ],
	'chicago-lincoln-park' => [ 'url' => 'https://maps.app.goo.gl/ninFDe3tVj7U5sYx6', 'address' => '800 W Diversey Pkwy, Chicago, IL 60614' ],

	// ── McHenry office ──
	'antioch'              => $_mchenry,
	'barrington-hills'     => $_mchenry,
	'belden'               => $_mchenry,
	'bull-valley'          => $_mchenry,
	'burtons-bridge'       => $_mchenry,
	'cary'                 => $_mchenry,
	'channel-lake'         => $_mchenry,
	'crystal-lake'         => $_mchenry,
	'ferndale'             => $_mchenry,
	'forest-lake'          => $_mchenry,
	'fox-lake'             => $_mchenry,
	'fox-lake-hills'       => $_mchenry,
	'franklinville'        => $_mchenry,
	'grandwood-park'       => $_mchenry,
	'greenwood'            => $_mchenry,
	'hainesville'          => $_mchenry,
	'harmony'              => $_mchenry,
	'hartland'             => $_mchenry,
	'hawthorn-woods'       => $_mchenry,
	'holiday-hills'        => $_mchenry,
	'huntley'              => $_mchenry,
	'ingleside'            => $_mchenry,
	'ingleside-shore'      => $_mchenry,
	'island-lake'          => $_mchenry,
	'johnsburg'            => $_mchenry,
	'kildeer'              => $_mchenry,
	'lake-barrington'      => $_mchenry,
	'lake-catherine'       => $_mchenry,
	'lake-in-the-hills'    => $_mchenry,
	'lake-villa'           => $_mchenry,
	'lake-zurich'          => $_mchenry,
	'lakemoor'             => $_mchenry,
	'lindenhurst'          => $_mchenry,
	'long-grove'           => $_mchenry,
	'long-lake'            => $_mchenry,
	'mccullom-lake'        => $_mchenry,
	'mylith-park'          => $_mchenry,
	'oakwood-hills'        => $_mchenry,
	'old-mill-creek'       => $_mchenry,
	'pistakee-highlands'   => $_mchenry,
	'prairie-grove'        => $_mchenry,
	'richmond'             => $_mchenry,
	'ridgefield'           => $_mchenry,
	'ringwood'             => $_mchenry,
	'round-lake'           => $_mchenry,
	'round-lake-beach'     => $_mchenry,
	'round-lake-heights'   => $_mchenry,
	'round-lake-park'      => $_mchenry,
	'solon-mills'          => $_mchenry,
	'spring-grove'         => $_mchenry,
	'trout-valley'         => $_mchenry,
	'venetian-cillage'     => $_mchenry,
	'venetian-village'     => $_mchenry,
	'village-of-lakewood'  => $_mchenry,
	'volo'                 => $_mchenry,
	'wauconda'             => $_mchenry,
	'williams-park'        => $_mchenry,
	'wonder-lake'          => $_mchenry,
	'woodstock'            => $_mchenry,

	// ── Elgin office ──
	'bartlett'             => $_elgin,
	'allens-corners'       => $_elgin,
	'almora'               => $_elgin,
	'alora-heights'        => $_elgin,
	'burlington'           => $_elgin,
	'campton-hills'        => $_elgin,
	'carol-stream'         => $_elgin,
	'gilberts'             => $_elgin,
	'hampshire'            => $_elgin,
	'knoll-creek-west'     => $_elgin,
	'lily-lake'            => $_elgin,
	'new-lebanon'          => $_elgin,
	'pingree-grove'        => $_elgin,
	'plato-center'         => $_elgin,
	'south-elgin'          => $_elgin,
	'st-charles'           => $_elgin,
	'starks'               => $_elgin,
	'west-highland-acre'   => $_elgin,
	'wildwood-valley'      => $_elgin,
	'williamsburg-green'   => $_elgin,

	// ── Arlington Heights office ──
	'bloomingdale'         => $_arh,
	'deer-park'            => $_arh,
	'elk-grove'            => $_arh,
	'hanover-park'         => $_arh,
	'hoffman-estates'      => $_arh,
	'inverness'            => $_arh,
	'keeneyville'          => $_arh,
	'mount-prospect'       => $_arh,
	'palatine'             => $_arh,
	'prospect-heights'     => $_arh,
	'rolling-meadows'      => $_arh,
	'roselle'              => $_arh,
	'schaumburg'           => $_arh,
	'wheeling'             => $_arh,

	// ── Northbrook office ──
	'bannockburn'          => $_nbrook,
	'green-oaks'           => $_nbrook,
	'buffalo-grove'        => $_nbrook,
	'fort-sheridan'        => $_nbrook,
	'glencoe'              => $_nbrook,
	'gurnee'               => $_nbrook,
	'highwood'             => $_nbrook,
	'highland-park'        => $_nbrook,
	'indian-creek'         => $_nbrook,
	'kenilworth'           => $_nbrook,
	'knollwood'            => $_nbrook,
	'lake-bluff'           => $_nbrook,
	'lake-forest'          => $_nbrook,
	'libertyville'         => $_nbrook,
	'lincolnshire'         => $_nbrook,
	'mettawa'              => $_nbrook,
	'mundelein'            => $_nbrook,
	'north-chicago'        => $_nbrook,
	'northfield'           => $_nbrook,
	'rondout'              => $_nbrook,
	'vernon-hills'         => $_nbrook,
	'waukegan'             => $_nbrook,
	'wells-corners'        => $_nbrook,
	'winnetka'             => $_nbrook,

	// ── Hinsdale office ──
	'burr-ridge'           => $_hinsdale,
	'butterfield'          => $_hinsdale,
	'clarendon-hills'      => $_hinsdale,
	'darien'               => $_hinsdale,
	'downers-grove'        => $_hinsdale,
	'glen-ellyn'           => $_hinsdale,
	'la-grange'            => $_hinsdale,
	'lombard'              => $_hinsdale,
	'oak-brook'            => $_hinsdale,
	'oakbrook-terrace'     => $_hinsdale,
	'villa-park'           => $_hinsdale,
	'westchester'          => $_hinsdale,
	'western-springs'      => $_hinsdale,
	'westmont'             => $_hinsdale,
	'york-center'          => $_hinsdale,

	// ── Naperville office ──
	'aurora'               => $_naperville,
	'bolingbrook'          => $_naperville,
	'plainfield'           => $_naperville,
	'romeoville'           => $_naperville,
	'welco-corners'        => $_naperville,
	'woodridge'            => $_naperville,

	// ── Evanston office ──
	'morton-grove'         => $_evanston,
	'skokie'               => $_evanston,
	'wilmette'             => $_evanston,
];
$nap_data = $nap_map[ $slug ] ?? [ 'url' => 'https://maps.app.goo.gl/k2RpBwmEiq1iir1x9', 'address' => '5126 N Ravenswood Ave, Chicago, IL 60640' ];

// ─── Areas served ─────────────────────────────────────────────────────────────
$areas_map = [
	// Special offices
	'algonquin'            => 'Northwest Suburban Chicago',
	'arlington-heights'    => 'Northwest Suburban Chicago',
	'elgin'                => 'Northwest Suburban Chicago',
	'mchenry'              => 'Northwest Suburban Chicago',
	'evanston'             => 'North Shore Chicagoland',
	'hinsdale'             => 'Western Suburbs',
	'naperville'           => 'Western Suburban Chicago',
	'northbrook'           => 'Northern Suburban Chicago',
	'geneva'               => 'Western Suburban Chicago',
	'johnsburg'            => 'Northwest Suburban Chicago',

	// McHenry office cities
	'antioch'              => 'Northwest Suburban Chicago',
	'barrington-hills'     => 'Northwest Suburban Chicago',
	'belden'               => 'Northwest Suburban Chicago',
	'bull-valley'          => 'Northwest Suburban Chicago',
	'burtons-bridge'       => 'Northwest Suburban Chicago',
	'cary'                 => 'Northwest Suburban Chicago',
	'channel-lake'         => 'Northwest Suburban Chicago',
	'crystal-lake'         => 'Northwest Suburban Chicago',
	'ferndale'             => 'Northwest Suburban Chicago',
	'forest-lake'          => 'Northwest Suburban Chicago',
	'fox-lake'             => 'Northwest Suburban Chicago',
	'fox-lake-hills'       => 'Northwest Suburban Chicago',
	'franklinville'        => 'Northwest Suburban Chicago',
	'grandwood-park'       => 'Northwest Suburban Chicago',
	'greenwood'            => 'Northwest Suburban Chicago',
	'hainesville'          => 'Northwest Suburban Chicago',
	'harmony'              => 'Northwest Suburban Chicago',
	'hartland'             => 'Northwest Suburban Chicago',
	'hawthorn-woods'       => 'Northwest Suburban Chicago',
	'holiday-hills'        => 'Northwest Suburban Chicago',
	'huntley'              => 'Northwest Suburban Chicago',
	'ingleside'            => 'Northwest Suburban Chicago',
	'ingleside-shore'      => 'Northwest Suburban Chicago',
	'island-lake'          => 'Northwest Suburban Chicago',
	'kildeer'              => 'Northwest Suburban Chicago',
	'lake-barrington'      => 'Northwest Suburban Chicago',
	'lake-catherine'       => 'Northwest Suburban Chicago',
	'lake-in-the-hills'    => 'Northwest Suburban Chicago',
	'lake-villa'           => 'Northwest Suburban Chicago',
	'lake-zurich'          => 'Northwest Suburban Chicago',
	'lakemoor'             => 'Northwest Suburban Chicago',
	'lindenhurst'          => 'Northwest Suburban Chicago',
	'long-grove'           => 'Northwest Suburban Chicago',
	'long-lake'            => 'Northwest Suburban Chicago',
	'mccullom-lake'        => 'Northwest Suburban Chicago',
	'mylith-park'          => 'Northwest Suburban Chicago',
	'oakwood-hills'        => 'Northwest Suburban Chicago',
	'old-mill-creek'       => 'Northwest Suburban Chicago',
	'pistakee-highlands'   => 'Northwest Suburban Chicago',
	'prairie-grove'        => 'Northwest Suburban Chicago',
	'richmond'             => 'Northwest Suburban Chicago',
	'ridgefield'           => 'Northwest Suburban Chicago',
	'ringwood'             => 'Northwest Suburban Chicago',
	'round-lake'           => 'Northwest Suburban Chicago',
	'round-lake-beach'     => 'Northwest Suburban Chicago',
	'round-lake-heights'   => 'Northwest Suburban Chicago',
	'round-lake-park'      => 'Northwest Suburban Chicago',
	'solon-mills'          => 'Northwest Suburban Chicago',
	'spring-grove'         => 'Northwest Suburban Chicago',
	'trout-valley'         => 'Northwest Suburban Chicago',
	'venetian-cillage'     => 'Northwest Suburban Chicago',
	'venetian-village'     => 'Northwest Suburban Chicago',
	'village-of-lakewood'  => 'Northwest Suburban Chicago',
	'volo'                 => 'Northwest Suburban Chicago',
	'wauconda'             => 'Northwest Suburban Chicago',
	'williams-park'        => 'Northwest Suburban Chicago',
	'wonder-lake'          => 'Northwest Suburban Chicago',
	'woodstock'            => 'Northwest Suburban Chicago',

	// Elgin office cities
	'bartlett'             => 'Northwest Suburban Chicago',
	'allens-corners'       => 'Northwest Suburban Chicago',
	'almora'               => 'Northwest Suburban Chicago',
	'alora-heights'        => 'Northwest Suburban Chicago',
	'burlington'           => 'Northwest Suburban Chicago',
	'campton-hills'        => 'Northwest Suburban Chicago',
	'carol-stream'         => 'Northwest Suburban Chicago',
	'gilberts'             => 'Northwest Suburban Chicago',
	'hampshire'            => 'Northwest Suburban Chicago',
	'knoll-creek-west'     => 'Northwest Suburban Chicago',
	'lily-lake'            => 'Northwest Suburban Chicago',
	'new-lebanon'          => 'Northwest Suburban Chicago',
	'pingree-grove'        => 'Northwest Suburban Chicago',
	'plato-center'         => 'Northwest Suburban Chicago',
	'south-elgin'          => 'Northwest Suburban Chicago',
	'st-charles'           => 'Northwest Suburban Chicago',
	'starks'               => 'Northwest Suburban Chicago',
	'west-highland-acre'   => 'Northwest Suburban Chicago',
	'wildwood-valley'      => 'Northwest Suburban Chicago',
	'williamsburg-green'   => 'Northwest Suburban Chicago',

	// Arlington Heights office cities
	'bloomingdale'         => 'Northwest Suburban Chicago',
	'deer-park'            => 'Northwest Suburban Chicago',
	'elk-grove'            => 'Northwest Suburban Chicago',
	'hanover-park'         => 'Northwest Suburban Chicago',
	'hoffman-estates'      => 'Northwest Suburban Chicago',
	'inverness'            => 'Northwest Suburban Chicago',
	'keeneyville'          => 'Northwest Suburban Chicago',
	'mount-prospect'       => 'Northwest Suburban Chicago',
	'palatine'             => 'Northwest Suburban Chicago',
	'prospect-heights'     => 'Northwest Suburban Chicago',
	'rolling-meadows'      => 'Northwest Suburban Chicago',
	'roselle'              => 'Northwest Suburban Chicago',
	'schaumburg'           => 'Northwest Suburban Chicago',
	'wheeling'             => 'Northwest Suburban Chicago',

	// Northbrook office cities
	'bannockburn'          => 'Northern Suburban Chicago',
	'green-oaks'           => 'Northern Suburban Chicago',
	'buffalo-grove'        => 'Northern Suburban Chicago',
	'fort-sheridan'        => 'Northern Suburban Chicago',
	'glencoe'              => 'Northern Suburban Chicago',
	'gurnee'               => 'Northern Suburban Chicago',
	'highwood'             => 'Northern Suburban Chicago',
	'highland-park'        => 'Northern Suburban Chicago',
	'indian-creek'         => 'Northern Suburban Chicago',
	'kenilworth'           => 'Northern Suburban Chicago',
	'knollwood'            => 'Northern Suburban Chicago',
	'lake-bluff'           => 'Northern Suburban Chicago',
	'lake-forest'          => 'Northern Suburban Chicago',
	'libertyville'         => 'Northern Suburban Chicago',
	'lincolnshire'         => 'Northern Suburban Chicago',
	'mettawa'              => 'Northern Suburban Chicago',
	'mundelein'            => 'Northern Suburban Chicago',
	'north-chicago'        => 'Northern Suburban Chicago',
	'northfield'           => 'Northern Suburban Chicago',
	'rondout'              => 'Northern Suburban Chicago',
	'vernon-hills'         => 'Northern Suburban Chicago',
	'waukegan'             => 'Northern Suburban Chicago',
	'wells-corners'        => 'Northern Suburban Chicago',
	'winnetka'             => 'Northern Suburban Chicago',

	// Hinsdale office cities
	'burr-ridge'           => 'Western Suburbs',
	'butterfield'          => 'Western Suburbs',
	'clarendon-hills'      => 'Western Suburbs',
	'darien'               => 'Western Suburbs',
	'downers-grove'        => 'Western Suburbs',
	'glen-ellyn'           => 'Western Suburbs',
	'la-grange'            => 'Western Suburbs',
	'lombard'              => 'Western Suburbs',
	'oak-brook'            => 'Western Suburbs',
	'oakbrook-terrace'     => 'Western Suburbs',
	'villa-park'           => 'Western Suburbs',
	'westchester'          => 'Western Suburbs',
	'western-springs'      => 'Western Suburbs',
	'westmont'             => 'Western Suburbs',
	'york-center'          => 'Western Suburbs',

	// Naperville office cities
	'aurora'               => 'Western Suburban Chicago',
	'bolingbrook'          => 'Western Suburban Chicago',
	'plainfield'           => 'Western Suburban Chicago',
	'romeoville'           => 'Western Suburban Chicago',
	'welco-corners'        => 'Western Suburban Chicago',
	'woodridge'            => 'Western Suburban Chicago',

	// Evanston office cities
	'morton-grove'         => 'North Shore Chicagoland',
	'skokie'               => 'North Shore Chicagoland',
	'wilmette'             => 'North Shore Chicagoland',
];
$area = $areas_map[ $slug ] ?? 'North and Northwest Side Chicago';

// ─── Related articles ─────────────────────────────────────────────────────────
$articles = jb_get_articles( $slug );

// ─── FAQs ─────────────────────────────────────────────────────────────────────
$faqs = get_posts( [
	'post_type'      => 'jb_faq',
	'post_status'    => 'publish',
	'posts_per_page' => 5,
] );
?>

<?php /* ──── HERO ──── */ ?>
<div class="city-page-hero">
	<img class="lazy city-page-image"
		data-src="<?php echo esc_url( $hero_src ); ?>"
		alt="<?php echo esc_attr( $h1 ); ?>" />
	<div class="contents">
		<div class="w">
			<h1><?php echo esc_html( $h1 ); ?></h1>

			<div class="reviews">
				<div class="elfsight-app-<?php echo esc_attr( $elfsight_hero_id ); ?>" data-elfsight-app-lazy></div>
			</div>

			<div class="nap">
				<div>
					<p>Local Office:</p>
					<a target="_blank" rel="noreferrer" href="<?php echo esc_url( $nap_data['url'] ); ?>">
						J. Blanton Plumbing, Sewer &amp; Drain - <?php echo esc_html( $gbp ); ?>
					</a>
				</div>
				<p><span>Address: </span><?php echo esc_html( $nap_data['address'] ); ?></p>
				<p><span>Areas Served: </span><?php echo esc_html( $area ); ?></p>
				<p><span>Hours Open: </span>24 hours</p>
				<div>
					<p>Phone:</p>
					<a href="tel:773-724-9272">(773) 724-9272</a>
				</div>
			</div>

			<?php if (is_page(2070) || get_post_field('post_name', get_the_ID()) === 'j-blanton-is-hiring'): ?>
			<a class="hero-link-button" href="https://i.jblantonplumbing.com/careers">
				<p>JOIN US</p>
			</a>
			<?php else: ?>
			<a class="hero-link-button" href="tel:773-724-9272">
				<div>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 15.5c-1.2 0-2.5-.2-3.6-.6h-.3c-.3 0-.5.1-.7.3l-2.2 2.2c-2.8-1.5-5.2-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1c-.3-1.1-.5-2.4-.5-3.6c0-.5-.5-1-1-1H4c-.5 0-1 .5-1 1c0 9.4 7.6 17 17 17c.5 0 1-.5 1-1v-3.5c0-.5-.5-1-1-1M5 5h1.5c.1.9.3 1.8.5 2.6L5.8 8.8C5.4 7.6 5.1 6.3 5 5m14 14c-1.3-.1-2.6-.4-3.8-.8l1.2-1.2c.8.2 1.7.4 2.6.4z"/></svg>
				</div>
				<p>773-724-9272</p>
			</a>
			<?php endif; ?>

			<?php if ( $callout ) : ?>
			<p class="callout"><?php echo esc_html( $callout ); ?></p>
			<?php endif; ?>
		</div>
		<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/wrench_pattern.webp" alt="" />
	</div>
</div>

<?php /* ──── HERO NAV ──── */ ?>
<?php get_template_part( 'template-parts/hero', 'nav' ); ?>

<?php /* ──── EVANSTON REVIEWS ──── */ ?>
<?php if ( $slug === 'evanston' ) : ?>
<div class="evanston-reviews">
	<div class="elfsight-app-5897a421-6392-41bb-b926-3026c386b0b9" data-elfsight-app-lazy></div>
</div>
<?php endif; ?>

<?php /* ──── CONTENT SECTION ──── */ ?>
<div class="cream">
	<div class="city-page-content">
		<div class="f">
			<div class="l">
				<p class="red-text">
					<?php if ( $slug === 'evanston' ) : ?>
						WHY J. BLANTON FOR EVANSTON PLUMBING
					<?php else : ?>
						WE'VE GOT YOU COVERED, <span><?php echo esc_html( $geo ); ?></span>
					<?php endif; ?>
				</p>
				<img class="lazy" data-src="<?php echo esc_url( $hero_src ); ?>" alt="" style="display:none" />
				<?php if ( $service ) : ?>
				<p><?php echo wp_kses_post( $service ); ?></p>
				<?php elseif ( $city_content ) : ?>
				<p><?php echo wp_kses_post( $city_content ); ?></p>
				<?php endif; ?>
			</div>
			<img class="lazy" data-src="<?php echo esc_url( $hero_src ); ?>" alt="<?php echo esc_attr( $geo ); ?>" />
		</div>

		<?php /* Google Map */ ?>
		<iframe class="city-page-map" width="100%" height="300" frameborder="0" scrolling="no"
			marginheight="0" marginwidth="0" loading="lazy"
			src="<?php echo esc_url( 'https://maps.google.com/maps?hl=en&q=' . urlencode( $geo . ', Illinois' ) . '&t=&z=14&ie=UTF8&iwloc=B&output=embed' ); ?>">
		</iframe>

		<div class="f2">
			<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/manplumber.webp" alt="J. Blanton Plumber" />
			<div class="r">
				<?php if ( $page_title_field ) : ?>
				<p class="red-text"><?php echo esc_html( $page_title_field ); ?></p>
				<?php endif; ?>
				<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/manplumber.webp" alt="" />
				<?php if ( $city_content ) : ?>
				<p><?php echo wp_kses_post( $city_content ); ?></p>
				<?php else : ?>
				<?php the_content(); ?>
				<?php endif; ?>
			</div>
		</div>

		<?php /* Services menu */ ?>
		<div class="services-menu">
			<p class="red-text2">OUR SERVICES</p>
			<?php get_template_part( 'template-parts/city', 'services-menu', [ 'city_slug' => $slug ] ); ?>
		</div>

		<?php /* Content Elfsight reviews */ ?>
		<div class="city-page-gr">
			<div class="elfsight-app-<?php echo esc_attr( $elfsight_content_id ); ?>" data-elfsight-app-lazy></div>
		</div>

		<?php /* Northbrook f1 section */ ?>
		<?php if ( $slug === 'northbrook' ) : ?>
		<div class="f1">
			<img src="https://d1rplazj5a80fb.cloudfront.net/images/northbrook-6.webp" alt="">
			<div class="l">
				<p class="red-text"> EXPERT PLUMBING REPAIRS IN NORTHBROOK: YOUR TRUSTED LOCAL SERVICE </p>
				<p></p>
				<p> Northbrook, known for its scenic neighborhoods and a blend of classic and contemporary homes, trusts J. Blanton Plumbing for dependable, expert plumbing services. </p>
				<p> With thousands of residences spread across this dynamic suburb, homeowners rely on our nearby team for everything from planned maintenance to unexpected plumbing emergencies. Whether it's a mid-century ranch or a newly built home, we understand the unique needs of Northbrook properties. J. Blanton Plumbing is committed to delivering fast, professional solutions that keep your home's plumbing in peak condition—because keeping Northbrook flowing smoothly is what we do best.</p>
			</div>
		</div>
		<?php endif; ?>

		<?php /* TikTok / Social */ ?>
		<p class="ep-tiktok-headline">J Blanton Plumbing - Turning Bad Calls to Good Calls</p>
		<div class="city-social-media">
			<div class="elfsight-app-9f370c11-108b-412b-8529-6b3f093f04a3" data-elfsight-app-lazy></div>
		</div>

		<?php /* Related articles */ ?>
		<?php if ( ! empty( $articles ) ) : ?>
		<div class="city-articles"><div class="articles-component">
			<?php foreach ( $articles as $article ) :
				$thumb = get_post_meta( $article->ID, 'article_image', true ) ?: $cf . 'hero_image.webp';
			?>
			<div class="article-card">
				<img class="lazy" data-src="<?php echo esc_url( $thumb ); ?>" alt="<?php echo esc_attr( $article->post_title ); ?>" />
				<div>
					<p class="article-title"><?php echo esc_html( $article->post_title ); ?></p>
					<p><?php echo esc_html( wp_trim_words( $article->post_excerpt ?: $article->post_content, 20, '...' ) ); ?></p>
					<a href="<?php echo esc_url( get_permalink( $article->ID ) ); ?>">
						<p>Read more</p>
						<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"/></svg>
					</a>
				</div>
			</div>
			<?php endforeach; ?>
			</div>
		</div>
		<?php endif; ?>

		<?php /* OUR PARTNERS carousel (Evanston and Northbrook only) */ ?>
		<?php
		$carousel_items = [];
		if ( $slug === 'evanston' ) {
			$carousel_items = [
				'https://d1rplazj5a80fb.cloudfront.net/partners/Art+and+Science.webp',
				'https://d1rplazj5a80fb.cloudfront.net/partners/Dazzle+Logo.webp',
				'https://d1rplazj5a80fb.cloudfront.net/partners/Eva+Nails.webp',
				'https://d1rplazj5a80fb.cloudfront.net/partners/Lavender+Logo.webp',
				'https://d1rplazj5a80fb.cloudfront.net/partners/Hops-Grapes_UberEats-Logo.webp',
				'https://d1rplazj5a80fb.cloudfront.net/partners/follow-your-nose-logo.webp',
			];
		} elseif ( $slug === 'northbrook' ) {
			$carousel_items = [
				'https://d1rplazj5a80fb.cloudfront.net/partners/l1.png',
				'https://d1rplazj5a80fb.cloudfront.net/partners/l2.jpeg',
				'https://d1rplazj5a80fb.cloudfront.net/partners/l3.jpeg',
				'https://d1rplazj5a80fb.cloudfront.net/partners/l4.jpeg',
				'https://d1rplazj5a80fb.cloudfront.net/partners/l5.png',
				'https://d1rplazj5a80fb.cloudfront.net/partners/nc1.png',
			];
		}
		if ( ! empty( $carousel_items ) ) : ?>
		<p class="red-text2"> OUR PARTNERS </p>
		<div class="image-carousel">
			<div class="carousel-track">
				<?php foreach ( array_merge( $carousel_items, $carousel_items, $carousel_items ) as $cimg ) : ?>
				<div class="carousel-item"><img src="<?php echo esc_url( $cimg ); ?>" alt=""></div>
				<?php endforeach; ?>
			</div>
		</div>
		<?php endif; ?>

		<?php /* City locations grid */ ?>
		<div class="city-locations">
			<div class="city-labels">
				<p>Proudly Serving the Greater Chicagoland Area for 30+ Years</p>
				<p>Some areas we serve, but are not limited to, include:</p>
			</div>
			<div class="l-cities">
				<?php
				// Query city pages (v1 + v2 templates), deduplicate, filter empty city_name
				$_city_args = [ 'post_type' => 'page', 'post_status' => 'publish', 'posts_per_page' => 500, 'orderby' => 'title', 'order' => 'ASC', 'update_post_meta_cache' => true ];
				$_v1 = get_posts( array_merge( $_city_args, [ 'meta_key' => '_wp_page_template', 'meta_value' => 'page-city.php' ] ) );
				$_v2 = get_posts( array_merge( $_city_args, [ 'meta_key' => '_wp_page_template', 'meta_value' => 'page-city-v2.php' ] ) );
				$city_pages = [];
				$_seen_ids  = [];
				foreach ( array_merge( $_v1, $_v2 ) as $_cp ) {
					if ( isset( $_seen_ids[ $_cp->ID ] ) ) continue;
					$_cn = get_post_meta( $_cp->ID, 'city_name', true );
					if ( empty( $_cn ) ) continue;
					$_seen_ids[ $_cp->ID ] = true;
					$city_pages[] = $_cp;
				}
				usort( $city_pages, function( $a, $b ) {
					return strcasecmp(
						get_post_meta( $a->ID, 'city_name', true ) ?: $a->post_title,
						get_post_meta( $b->ID, 'city_name', true ) ?: $b->post_title
					);
				} );
				if ( ! empty( $city_pages ) ) :
					$chunks = array_chunk( $city_pages, (int) ceil( count( $city_pages ) / 4 ) );
					foreach ( $chunks as $chunk ) : ?>
					<div>
						<?php foreach ( $chunk as $cp ) : ?>
						<div>
							<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M12 11.5A2.5 2.5 0 0 1 9.5 9A2.5 2.5 0 0 1 12 6.5A2.5 2.5 0 0 1 14.5 9a2.5 2.5 0 0 1-2.5 2.5M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7"/></svg>
							<a href="<?php echo esc_url( get_permalink( $cp->ID ) ); ?>"><?php echo esc_html( get_post_meta( $cp->ID, 'city_name', true ) ?: $cp->post_title ); ?></a>
						</div>
						<?php endforeach; ?>
					</div>
					<?php endforeach;
				endif; ?>
			</div>
		</div>

		<?php /* FAQ Accordion */ ?>
		<?php if ( ! empty( $faqs ) ) : ?>
		<div class="faqs">
			<?php foreach ( $faqs as $idx => $faq ) : ?>
			<div class="faq">
				<div id="faq-head<?php echo $idx; ?>" class="head">
					<p><?php echo esc_html( $faq->post_title ); ?></p>
					<div class="svg">
						<svg id="add<?php echo $idx; ?>" class="add" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M13 6a1 1 0 1 0-2 0v5H6a1 1 0 1 0 0 2h5v5a1 1 0 1 0 2 0v-5h5a1 1 0 1 0 0-2h-5z"/></svg>
					</div>
					<div class="svg minus">
						<svg id="minus<?php echo $idx; ?>" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14"/></svg>
					</div>
				</div>
				<div id="faq-content<?php echo $idx; ?>" class="faq-content">
					<p><?php echo wp_kses_post( $faq->post_content ?: get_post_meta( $faq->ID, '_jb_faq_answer', true ) ); ?></p>
				</div>
			</div>
			<?php endforeach; ?>
		</div>
		<?php endif; ?>

	</div>
</div>

<script>
(() => {
	const faqs = document.querySelectorAll(".faq");
	faqs.forEach((v, i) => {
		let open = false;
		const add   = document.getElementById(`add${i}`);
		const minus = document.getElementById(`minus${i}`);
		const head  = document.getElementById(`faq-head${i}`);
		const body  = document.getElementById(`faq-content${i}`);
		if (!head || !body) return;
		const closedH = `${head.offsetHeight}px`;
		v.style.height = closedH;
		v.addEventListener("click", () => {
			open = !open;
			v.style.height = open ? `${body.offsetHeight + head.offsetHeight + 20}px` : closedH;
			if (add)   add.style.display   = open ? "none"  : "block";
			if (minus) minus.style.display = open ? "block" : "none";
		});
	});
})();
</script>

<?php endwhile; endif; ?>
<?php get_footer(); ?>
