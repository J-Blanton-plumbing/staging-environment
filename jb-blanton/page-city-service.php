<?php
/**
 * Template Name: City Service Page
 * Template for city+service child pages (has parent city page).
 */

get_header();

if ( have_posts() ) : while ( have_posts() ) : the_post();

$post_id   = get_the_ID();
$slug      = get_post_field( 'post_name', $post_id );
$parent_id = (int) get_post_field( 'post_parent', $post_id );

// ─── ACF data for this service page ──────────────────────────────────────────
$h1      = get_field( 'service_header' )     ?: get_the_title();
$h2      = get_field( 'service_header2' )    ?: '';
$callout = get_field( 'service_callout' )    ?: '';
$content = get_field( 'service_content' )    ?: get_the_content();

// ─── Parent city data ─────────────────────────────────────────────────────────
$parent_slug = $parent_id ? get_post_field( 'post_name', $parent_id ) : '';
$geo         = $parent_id ? ( get_field( 'city_name', $parent_id ) ?: get_the_title( $parent_id ) ) : '';
$gbp         = $parent_id ? ( get_field( 'gbp', $parent_id ) ?: $geo ) : '';
$parent_url  = $parent_id ? get_permalink( $parent_id ) : home_url( '/' );

// ─── CloudFront base ──────────────────────────────────────────────────────────
$cf = 'https://d1rplazj5a80fb.cloudfront.net/images/';

// ─── Hero image ───────────────────────────────────────────────────────────────
$raw_img = get_field( 'service_hero_image' ) ?: '';
if ( empty( $raw_img ) || strpos( $raw_img, 'vid_' ) !== false ) {
	$hero_src = $cf . 'hero_image.webp';
} elseif ( strpos( $raw_img, 'wp-content' ) !== false ) {
	$parts    = explode( 'wp-content', $raw_img );
	$hero_src = $cf . 'wp-content' . end( $parts );
} elseif ( strpos( $raw_img, 'http' ) === 0 ) {
	$hero_src = $raw_img;
} else {
	$hero_src = $cf . ltrim( $raw_img, '/' ) . ( strpos( $raw_img, '.' ) === false ? '.webp' : '' );
}

// ─── Hero elfsight ID (per parent city) ──────────────────────────────────────
$elfsight_id = jb_get_elfsight_ids( $parent_slug );

// ─── NAP data (per parent city) ───────────────────────────────────────────────
$nap_map = [
	'algonquin'            => [ 'url' => 'https://maps.app.goo.gl/egVEqHQJkzFG8Qo56',  'name' => 'Algonquin',        'address' => '2390 Esplanade Dr #200f, Algonquin, IL 60102, United States', 'areas' => 'Northwest Suburban Chicago' ],
	'arlington-heights'    => [ 'url' => 'https://maps.app.goo.gl/Qq4qPYJT8bCgash26',  'name' => 'Arlington Heights','address' => '1204 E. Central Road, Suite 3, Arlington Heights, IL 60005',   'areas' => 'Northwest Suburban Chicago' ],
	'elgin'                => [ 'url' => 'https://maps.app.goo.gl/5J1K7ZVgFeNwy8VJ8',  'name' => 'Elgin',            'address' => '964 N McLean Blvd, Elgin, IL 60123-2039',                     'areas' => 'Northwest Suburban Chicago' ],
	'hinsdale'             => [ 'url' => 'https://maps.app.goo.gl/UfWAoTRbWkAPR6WYA',  'name' => 'Hinsdale',         'address' => '15 Spinning Wheel Rd #216a, Hinsdale, IL 60521',              'areas' => 'Western Suburbs' ],
	'mchenry'              => [ 'url' => 'https://maps.app.goo.gl/DQ4fP5QXZr7TpBJ48',  'name' => 'McHenry',          'address' => '3406 W Elm St, Mchenry, IL 60050',                            'areas' => 'Northwest Suburban Chicago' ],
	'naperville'           => [ 'url' => 'https://maps.app.goo.gl/9ou5MAtuAMjG6XfN8',  'name' => 'Naperville',       'address' => '200 S Main Street, Suite 3, Naperville, IL 60540',            'areas' => 'Western Suburban Chicago' ],
	'northbrook'           => [ 'url' => 'https://maps.app.goo.gl/pCmmYeescW7Mf6B2A',  'name' => 'Northbrook',       'address' => '1945 Techny Road, #11, Northbrook, IL 60062',                 'areas' => 'Northern Suburban Chicago' ],
	'elmhurst'             => [ 'url' => 'https://maps.app.goo.gl/UfWAoTRbWkAPR6WYA',  'name' => 'Hinsdale',         'address' => '15 Spinning Wheel Rd #216a, Hinsdale, IL 60521',              'areas' => 'Western Suburbs' ],
	'chicago-lincoln-park' => [ 'url' => 'https://maps.app.goo.gl/k2RpBwmEiq1iir1x9',  'name' => 'Ravenswood',       'address' => '5126 N Ravenswood Ave, Chicago, IL 60640',                    'areas' => 'North and Northwest Side Chicago' ],
	'chicago-ravenswood'   => [ 'url' => 'https://maps.app.goo.gl/k2RpBwmEiq1iir1x9',  'name' => 'Ravenswood',       'address' => '5126 N Ravenswood Ave, Chicago, IL 60640',                    'areas' => 'North and Northwest Side Chicago' ],
	'skokie'               => [ 'url' => 'https://maps.app.goo.gl/rqmTxHMcicWhz1yV7',  'name' => 'Evanston',         'address' => '1603 Orrington Ave #600-1085, Evanston, IL 60201',            'areas' => 'North Shore Chicagoland' ],
	'evanston'             => [ 'url' => 'https://maps.app.goo.gl/rqmTxHMcicWhz1yV7',  'name' => 'Evanston',         'address' => '1603 Orrington Ave #600-1085, Evanston, IL 60201',            'areas' => 'North Shore Chicagoland' ],
	'geneva'               => [ 'url' => 'https://maps.app.goo.gl/9ou5MAtuAMjG6XfN8',  'name' => 'Naperville',       'address' => '200 S Main Street, Suite 3, Naperville, IL 60540',            'areas' => 'Western Suburban Chicago' ],
];
$nap = $nap_map[ $parent_slug ] ?? [ 'url' => 'https://maps.app.goo.gl/k2RpBwmEiq1iir1x9', 'name' => 'Ravenswood', 'address' => '5126 N Ravenswood Ave, Chicago, IL 60640', 'areas' => 'North and Northwest Side Chicago' ];

// ─── Content reviews elfsight ID (per parent city) ───────────────────────────
$elfsight_content_map = [
	'algonquin'            => '8a4401fa-c2fb-411e-9bf3-8e691c1a9d5b',
	'arlington-heights'    => '63cfff20-7624-4c5b-9d7a-1ee39d90d602',
	'elgin'                => '54f95d6e-ce23-49c6-b3ac-8e4234199072',
	'hinsdale'             => '6a7311e8-5c7b-427d-9517-2a73c6b64d6c',
	'mchenry'              => 'ce2757ba-58d8-43ec-8e87-5003099a592c',
	'naperville'           => '53445308-2ca6-49c1-ac47-da5c3a6401f6',
	'northbrook'           => '37a7d292-8861-4ea3-9680-c342123c50bc',
	'elmhurst'             => '67911321-4b72-4209-b157-fc9812eadd3b',
	'chicago-lincoln-park' => '67911321-4b72-4209-b157-fc9812eadd3b',
	'chicago-ravenswood'   => '67911321-4b72-4209-b157-fc9812eadd3b',
	'skokie'               => '67911321-4b72-4209-b157-fc9812eadd3b',
	'evanston'             => '67911321-4b72-4209-b157-fc9812eadd3b',
	'geneva'               => '53445308-2ca6-49c1-ac47-da5c3a6401f6',
];
$elfsight_content_id = $elfsight_content_map[ $parent_slug ] ?? '266c99c1-530c-4f93-8046-bab90e4a05e5';

// ─── V2 city (evanston/northbrook/elmhurst) detection ────────────────────────
$parent_template = $parent_id ? get_post_meta( $parent_id, '_wp_page_template', true ) : '';
$is_v2_city      = ( $parent_template === 'page-city-v2.php' );
$v2_video_map    = [
	'evanston'   => [ 'src' => 'https://d1rplazj5a80fb.cloudfront.net/videos/evanston-hero-horizontal.mp4', 'poster' => $cf . 'tumbh2.webp' ],
	'northbrook' => [ 'src' => 'https://d1rplazj5a80fb.cloudfront.net/videos/Northbrook+Header+Video.mp4',  'poster' => $cf . 'tumbh3.webp' ],
	'elmhurst'   => [ 'src' => '',                                                                          'poster' => $cf . 'wp-content/uploads/2019/11/Plumbing-Rough-In-800x600.jpg' ],
];
$v2_video       = $is_v2_city ? ( $v2_video_map[ $parent_slug ] ?? [ 'src' => '', 'poster' => $cf . 'hero_image.webp' ] ) : null;
$v2_reviews_map = [
	'evanston'   => '5897a421-6392-41bb-b926-3026c386b0b9',
	'northbrook' => '37a7d292-8861-4ea3-9680-c342123c50bc',
	'elmhurst'   => '269bffb8-d3db-4476-ba58-616ab4849cec',
];
$v2_reviews_id  = $is_v2_city ? ( $v2_reviews_map[ $parent_slug ] ?? '' ) : '';


// ─── Related articles ─────────────────────────────────────────────────────────
$articles = get_posts( [ 'post_type' => 'jb_article', 'post_status' => 'publish', 'numberposts' => 3, 'category_name' => $parent_slug ] );
if ( empty( $articles ) ) {
	$articles = get_posts( [ 'post_type' => 'jb_article', 'post_status' => 'publish', 'numberposts' => 3 ] );
}

// ─── FAQs (filtered by current service category) ──────────────────────────────
$_faq_svc = get_post_meta( $post_id, '_jb_service', true );
$faqs = $_faq_svc ? get_posts( [
	'post_type'      => 'jb_faq',
	'post_status'    => 'publish',
	'posts_per_page' => 6,
	'meta_query'     => [ [ 'key' => '_jb_faq_category', 'value' => $_faq_svc, 'compare' => '=' ] ],
] ) : [];

// ─── City location pages ──────────────────────────────────────────────────────
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
	$city_pages[]          = $_cp;
}
usort( $city_pages, function( $a, $b ) {
	return strcasecmp(
		get_post_meta( $a->ID, 'city_name', true ) ?: $a->post_title,
		get_post_meta( $b->ID, 'city_name', true ) ?: $b->post_title
	);
} );
?>

<?php /* ──── HERO ──── */ ?>
<?php if ( $is_v2_city && $v2_video ) : ?>
<div class="test2-hero">
	<video class="hero2-video-desktop"
		src="<?php echo esc_url( $v2_video['src'] ); ?>"
		poster="<?php echo esc_url( $v2_video['poster'] ); ?>"
		loop autoplay muted playsinline>
		Video not supported on your browser.
	</video>
	<div class="test2-hero-body">
		<div class="test2-hero-contents">
			<div class="l">
				<img class="lazy hero-home24-7" data-src="<?php echo esc_url( $cf . 'home/247.webp' ); ?>" alt="24/7" />
				<h1><?php echo esc_html( strtoupper( $geo ) ); ?> PLUMBING EXPERTS<br /><a href="tel:773-724-9272">MAKE A GOOD CALL!</a></h1>
			</div>
			<div class="r">
				<p class="intro"><?php echo esc_html( $geo ); ?> is where you call home, and when plumbing issues arise, J. Blanton Plumbing is here to help with fast, expert solutions that restore comfort and peace to your home.</p>
				<a class="test2-hero-contact" href="tel:773-724-9272">
					<div><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 15.5c-1.2 0-2.5-.2-3.6-.6h-.3c-.3 0-.5.1-.7.3l-2.2 2.2c-2.8-1.5-5.2-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1c-.3-1.1-.5-2.4-.5-3.6c0-.5-.5-1-1-1H4c-.5 0-1 .5-1 1c0 9.4 7.6 17 17 17c.5 0 1-.5 1-1v-3.5c0-.5-.5-1-1-1"/></svg></div>
					<p>773-724-9272</p>
				</a>
			</div>
		</div>
	</div>
</div>
<?php else : ?>
<div class="city-page-hero">
	<img class="lazy city-page-image"
		data-src="<?php echo esc_url( $hero_src ); ?>"
		alt="<?php echo esc_attr( $h1 ); ?>" />
	<div class="contents">
		<div class="w">
			<h1><?php echo esc_html( $h1 ); ?></h1>

			<div class="reviews">
				<div class="elfsight-app-<?php echo esc_attr( $elfsight_id ); ?>" data-elfsight-app-lazy></div>
			</div>

			<div class="nap">
				<?php if ( $geo ) : ?>
				<div>
					<p>Local Office:</p>
					<a target="_blank" rel="noreferrer" href="<?php echo esc_url( $nap['url'] ); ?>">
						J. Blanton Plumbing, Sewer &amp; Drain - <?php echo esc_html( $nap['name'] ); ?>
					</a>
				</div>
				<?php if ( $nap['address'] ) : ?>
				<p><span>Address: </span><?php echo esc_html( $nap['address'] ); ?></p>
				<?php endif; ?>
				<?php if ( $nap['areas'] ) : ?>
				<p><span>Areas Served: </span><?php echo esc_html( $nap['areas'] ); ?></p>
				<?php endif; ?>
				<?php endif; ?>
				<p><span>Hours Open: </span> 24 hours</p>
				<div>
					<p>Phone:</p>
					<a href="tel:773-724-9272">(773) 724-9272</a>
				</div>
			</div>

			<a class="hero-link-button" href="tel:773-724-9272">
				<div>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 15.5c-1.2 0-2.5-.2-3.6-.6h-.3c-.3 0-.5.1-.7.3l-2.2 2.2c-2.8-1.5-5.2-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1c-.3-1.1-.5-2.4-.5-3.6c0-.5-.5-1-1-1H4c-.5 0-1 .5-1 1c0 9.4 7.6 17 17 17c.5 0 1-.5 1-1v-3.5c0-.5-.5-1-1-1M5 5h1.5c.1.9.3 1.8.5 2.6L5.8 8.8C5.4 7.6 5.1 6.3 5 5m14 14c-1.3-.1-2.6-.4-3.8-.8l1.2-1.2c.8.2 1.7.4 2.6.4z"/></svg>
				</div>
				<p>773-724-9272</p>
			</a>

			<?php if ( $callout ) : ?>
			<p class="callout"><?php echo esc_html( $callout ); ?></p>
			<?php endif; ?>
		</div>
		<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/wrench_pattern.webp" alt="" />
	</div>
</div>
<?php endif; ?>

<?php get_template_part( 'template-parts/hero', 'nav' ); ?>

<div class="evanston-reviews">
	<?php if ( $v2_reviews_id ) : ?>
	<div class="elfsight-app-<?php echo esc_attr( $v2_reviews_id ); ?>" data-elfsight-app-lazy></div>
	<?php endif; ?>
</div>

<div class="cream">
	<div class="city-page-content">

		<div class="f">
			<div class="l">
				<?php if ( $geo ) : ?>
				<p class="red-text">WE'VE GOT YOU COVERED, <span><?php echo esc_html( $geo ); ?></span></p>
				<?php endif; ?>

				<img class="lazy" data-src="<?php echo esc_url( $hero_src ); ?>" alt="<?php echo esc_attr( $h1 ); ?>" />

				<?php if ( $content ) : ?>
					<?php echo wp_kses_post( $content ); ?>
				<?php endif; ?>
			</div>
			<img class="lazy" data-src="<?php echo esc_url( $hero_src ); ?>" alt="<?php echo esc_attr( $h1 ); ?>" />
		</div>

		<iframe class="city-page-map" width="100%" frameborder="0" scrolling="no" marginheight="0" marginwidth="0"
			src="<?php echo esc_url( 'https://maps.google.com/maps?hl=en&q=' . rawurlencode( $geo . ', Illinois' ) . '&t=&z=14&ie=UTF8&iwloc=B&output=embed' ); ?>">
		</iframe>

		<?php
		// f2 body: city description only (strip h1 + appended service_content)
		$_pc      = get_the_content();
		$_pc      = preg_replace( '/<h[1-6][^>]*>.*?<\/h[1-6]>/is', '', $_pc, 1 );
		$_pc      = trim( $_pc );
		$_sc_raw  = get_post_meta( get_the_ID(), 'service_content', true );
		if ( ! empty( $_sc_raw ) ) {
			$_sc_needle = substr( wp_strip_all_tags( trim( $_sc_raw ) ), 0, 50 );
			$_pc_plain  = wp_strip_all_tags( $_pc );
			$_cut       = $_sc_needle ? strpos( $_pc_plain, $_sc_needle ) : false;
			$_f2_body   = $_cut !== false ? trim( substr( $_pc_plain, 0, $_cut ) ) : $_pc_plain;
		} else {
			$_f2_body = wp_strip_all_tags( $_pc );
		}
		?>
		<div class="f2">
			<img class="lazy" data-src="<?php echo esc_url( $cf . 'manplumber.webp' ); ?>" alt="Man" />
			<div class="r">
				<p class="red-text"><?php echo esc_html( get_the_title() ); ?></p>
				<img class="lazy" data-src="<?php echo esc_url( $cf . 'manplumber.webp' ); ?>" alt="Man" />
				<?php if ( $_f2_body ) : ?>
				<p><?php echo esc_html( $_f2_body ); ?></p>
				<?php endif; ?>
			</div>
		</div>

		<div class="services-menu">
			<p class="red-text2">OUR SERVICES</p>
			<?php get_template_part( 'template-parts/city', 'services-menu', [ 'city_slug' => $parent_slug ] ); ?>
		</div>

		<div class="city-page-gr">
			<div class="elfsight-app-<?php echo esc_attr( $elfsight_content_id ); ?>" data-elfsight-app-lazy></div>
		</div>

		<p class="ep-tiktok-headline">J Blanton Plumbing - Turning Bad Calls to Good Calls</p>
		<div class="city-social-media">
			<div class="elfsight-app-9f370c11-108b-412b-8529-6b3f093f04a3" data-elfsight-app-lazy></div>
		</div>

		<?php if ( ! empty( $articles ) ) : ?>
		<div class="city-articles">
			<div class="articles-component">
				<?php foreach ( $articles as $article ) :
					$thumb = get_post_meta( $article->ID, 'article_image', true ) ?: $cf . 'hero_image.webp';
				?>
				<div class="article-card">
					<img class="lazy" data-src="<?php echo esc_url( $thumb ); ?>" alt="<?php echo esc_attr( $article->post_title ); ?>" />
					<div>
						<p class="article-title"><?php echo esc_html( $article->post_title ); ?></p>
						<p><?php echo esc_html( wp_trim_words( $article->post_excerpt ?: $article->post_content, 20 ) ); ?></p>
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

		<div class="city-locations">
			<div class="city-labels">
				<p>Proudly Serving the Greater Chicagoland Area for 30+ Years</p>
				<p>Some areas we serve, but are not limited to, include:</p>
			</div>
			<div class="l-cities">
				<?php if ( ! empty( $city_pages ) ) : ?>
				<?php
				$_cols = array_chunk( $city_pages, (int) ceil( count( $city_pages ) / 5 ) );
				foreach ( $_cols as $_col ) : ?>
				<div>
					<?php foreach ( $_col as $city_page ) : ?>
					<div>
						<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M12 11.5A2.5 2.5 0 0 1 9.5 9A2.5 2.5 0 0 1 12 6.5A2.5 2.5 0 0 1 14.5 9a2.5 2.5 0 0 1-2.5 2.5M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7"/></svg>
						<a href="<?php echo esc_url( get_permalink( $city_page->ID ) ); ?>"><?php echo esc_html( get_field( 'city_name', $city_page->ID ) ?: $city_page->post_title ); ?></a>
					</div>
					<?php endforeach; ?>
				</div>
				<?php endforeach; ?>
				<?php endif; ?>
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
