<?php
/**
 * Template Name: Service Category Page
 * For service overview pages: /plumbing, /drain, /sewer, /water-heater, /water-quality
 */

get_header();

if ( have_posts() ) : while ( have_posts() ) : the_post();

$post_id = get_the_ID();
$slug    = get_post_field( 'post_name', $post_id );
$cf      = 'https://d1rplazj5a80fb.cloudfront.net/images/';

// ─── ACF fields ───────────────────────────────────────────────────────────────
$h1               = get_field( 'h1_tag' )            ?: get_the_title();
$headline         = get_field( 'headline' )          ?: '';
$headline2        = get_field( 'headline2' )         ?: '';
$raw_img          = get_field( 'hero_image' )        ?: '';
$benefits         = get_field( 'benefits' )          ?: '';
$ndc_text         = get_field( 'ndc_text' )          ?: '';
$final_tagline    = get_field( 'final_pitch_tagline' ) ?: '';
$final_text       = get_field( 'final_pitch_text' )  ?: '';

// ─── Hero image per slug ──────────────────────────────────────────────────────
$hero_map = [
	'plumbing'      => $cf . 'plumbing-hero.jpg',
	'drain'         => $cf . 'hero_image.webp',
	'sewer'         => $cf . 'chicago-sewer.webp',
	'water-heater'  => $cf . 'hero_image.webp',
	'water-quality' => $cf . 'water-quality-hero.webp',
	'commercial'    => $cf . 'Commercial+Jetting+copy.webp',
	'financing'     => $cf . 'clogged+drain-4.webp',
];
if ( ! empty( $raw_img ) && strpos( $raw_img, 'vid_' ) === false ) {
	if ( strpos( $raw_img, 'wp-content' ) !== false ) {
		$parts    = explode( 'wp-content', $raw_img );
		$hero_src = $cf . 'wp-content' . end( $parts );
	} elseif ( strpos( $raw_img, 'http' ) === 0 ) {
		$hero_src = $raw_img;
	} else {
		$hero_src = $cf . ltrim( $raw_img, '/' ) . ( strpos( $raw_img, '.' ) === false ? '.webp' : '' );
	}
} else {
	$hero_src = $hero_map[ $slug ] ?? $cf . 'hero_image.webp';
}

// ─── Hero label map ───────────────────────────────────────────────────────────
$h1_defaults = [
	'plumbing'      => 'EXPERT PLUMBING SERVICES BY J. BLANTON',
	'drain'         => "J. BLANTON, GOT A CLOGGED DRAIN?",
	'sewer'         => "SEWER PROBLEMS? J. BLANTON'S ON THE WAY!",
	'water-heater'  => 'J. BLANTON, IS YOUR WATER HEATER ON THE FRITZ?',
	'water-quality' => 'J. BLANTON, YOUR WATER QUALITY EXPERTS',
	'commercial'    => 'J. BLANTON KEEP YOUR BUSINESS FLOWING',
	'financing'     => "J. BLANTON, LET'S TALK FINANCING OPTIONS",
];
if ( empty( $h1 ) || $h1 === get_the_title() ) {
	$h1 = $h1_defaults[ $slug ] ?? strtoupper( get_the_title() );
}

// ─── Service descriptions ─────────────────────────────────────────────────────
$hero_descs = [
	'plumbing'      => 'Expert Residential Plumbing Services You Can Trust. From bathroom remodels to water heater installations, our certified plumbers deliver quality solutions for your home. Call J. Blanton for professional plumbing done right!',
	'drain'         => 'Slow water, bad smells, and recurring clogs are common drain problems that can quickly disrupt daily routines, but at J. Blanton Plumbing, our experienced team has the tools and expertise to diagnose the issue fast and fix it the right way.',
	'sewer'         => '24/7 Emergency Sewer Service: When disaster strikes, we\'re here. From backed-up lines to overflowing drains, our expert team will respond immediately to protect your home and restore your peace of mind. Don\'t wait—call us now!',
	'water-heater'  => 'When hot water disappears, our licensed plumbers provide fast water heater repair and expert water heater installation to restore comfort day or night.',
	'water-quality' => 'Pure, Clean Water 24/7: Expert Water Quality Solutions at Your Service. Don\'t compromise with contaminated or hard water—call us now! We\'ll transform your tap water into crystal-clear, healthy hydration.',
	'commercial'    => 'If your business is experiencing plumbing issues, we\'re here to help! From clogged drains to water heater problems, our expert team delivers fast, reliable solutions to keep your operations running smoothly.',
	'financing'     => "Flexible Financing Solutions for Your Plumbing Needs. Don't let budget concerns stop you from getting essential repairs. With our easy payment plans and quick approval process, you can get the plumbing service you need today. Call us to learn about our financing options and keep your home running smoothly!",
	// Sub-service pages
	'sewer-rodding'             => 'Clogged drains, recurring backups, and odors are key signs you may need sewer rodding, and our rodding services deliver fast, safe results with expert sewer rodding services when rodding a blocked drain is the best solution.',
	'clogged-drains-in-chicago' => 'Clogged drain? We\'re here 24/7 to clear it fast! From slow drains to complete blockages in Chicago, don\'t wait—call us now for immediate service. We\'ll turn your drain troubles into a Good Call.',
	'water-heater-repair'       => 'We provide 24/7 service for water heater emergencies. If you\'re facing an urgent issue like a leaking tank or no hot water, don\'t hesitate—pick up the phone and call us! We\'ll be there to restore your comfort with expert water heater repairs.',
	'bathroom-plumbing-chicago' => 'Expert Bathroom Plumbing Solutions in Chicago. From leaky faucets to complete remodels, our licensed plumbers are ready 24/7 to solve any bathroom emergency. Call us for fast, professional service you can trust!',
];
$hero_desc = $hero_descs[ $slug ] ?? '';

// ─── F-section image (body image) ────────────────────────────────────────────
$f_img_map = [
	'plumbing'      => $cf . 'laundry-room-2.webp',
	'sewer'         => $cf . 'preventative.webp',
	'drain'         => $cf . 'clogged-drain-hero.webp',
	'water-heater'  => $cf . 'preventative.webp',
	'water-quality' => $cf . 'preventative.webp',
	'commercial'    => $cf . 'Commercial+Jetting+copy.webp',
	'financing'               => $cf . 'clogged+drain-4.webp',
	// Sub-service pages
	'clogged-drains-in-chicago' => $cf . 'img_clogged-drains.webp',
	'sewer-rodding'             => $cf . 'img_sewer-rodding.webp',
	'water-heater-repair'       => $cf . 'img_water-heater-repair.webp',
	'bathroom-plumbing-chicago' => $cf . 'faucet%2Brepair%2Bstock.webp',
	'kitchen-sink-drain'        => $cf . 'Catch+Basin+copy.webp',
	'sewer-repair'              => $cf . 'IMG_9948.jpg',
];
$f_img = $f_img_map[ $slug ] ?? $cf . 'preventative.webp';

// ─── F3-section image (final pitch image) ────────────────────────────────────
$f3_img_map = [
	'plumbing'      => $cf . 'plumbing-f3.webp',
	'sewer'         => $cf . 'sewer-f3.webp',
	'drain'         => $cf . 'manplumber.webp',
	'water-heater'  => $cf . 'manplumber.webp',
	'water-quality' => $cf . 'manplumber.webp',
	'commercial'    => $cf . 'manplumber.webp',
	'financing'               => $cf . 'manplumber.webp',
	// Sub-service pages
	'clogged-drains-in-chicago' => $cf . 'clogged+drain-3.jpg',
	'sewer-rodding'             => $cf . 'manplumber.webp',
	'water-heater-repair'       => $cf . 'Tankless-19+copy.webp',
	'bathroom-plumbing-chicago' => $cf . 'manplumber.webp',
];
$f3_img = $f3_img_map[ $slug ] ?? $cf . 'preventative.webp';

// ─── F3-section tagline per slug ──────────────────────────────────────────────
$f3_tagline_defaults = [
	'plumbing'                => 'TURN A PLUMBING PROBLEM INTO A PERFECT SOLUTION',
	'drain'                   => 'Schedule Your Drain Service Today',
	'sewer'                   => 'TURN A SEWER CRISIS INTO A CLEAN SOLUTION',
	'water-heater'            => 'Schedule Water Heater Services with Confidence',
	'water-quality'           => 'TURN WATER ISSUES INTO A CLEAR SOLUTION',
	'commercial'              => 'WE TURN PLUMBING PROBLEMS INTO PLUMBING CONFIDENCE',
	'financing'               => 'TURN A TIGHT SPOT INTO A SMART PLAN',
	'sewer-rodding'           => 'Schedule Sewer Rodding Service Today',
	'clogged-drains-in-chicago' => 'TURN A CLOGGED DRAIN INTO A CLEAR CALL',
	'water-heater-repair'     => 'TURN A COLD SITUATION INTO A HOT SOLUTION',
	'bathroom-plumbing-chicago' => 'TURN A BATHROOM CRISIS INTO A BEAUTIFUL SOLUTION',
];
if ( empty( $final_tagline ) ) {
	$final_tagline = $f3_tagline_defaults[ $slug ] ?? '';
}

// ─── F2-section content (No Drip Club pitch per service) ─────────────────────
$f2_map = [
	'plumbing'      => [ "WE MAKE PLUMBING PROBLEMS DISAPPEAR", "Expert Drain Services in Chicagoland\n\nThat's why we created the No Drip Club, a complete peace of mind solution that helps prevent costly drain emergencies. Our certified technicians keep your drains flowing smoothly with professional maintenance and rapid response when issues arise." ],
	'sewer'         => [ "WE HATE SEWER PROBLEMS TOO", "That's why we created our expert sewer repair service, a complete peace of mind solution that helps you avoid costly emergency repairs and property damage." ],
	'drain'         => [ "Join the No Drip Club", "The No Drip Club is our premium maintenance program. Members receive priority scheduling and routine inspections. This helps catch small issues before they become big repairs. Discounts and exclusive benefits are included. It's an easy way to protect your plumbing year-round." ],
	'water-heater'  => [ "Avoid Cold Showers with the No Drip Club", "We hate cold showers too. That's why we created the No Drip Club, designed to keep your plumbing system running smoothly all year.\n\nMembers enjoy proactive care that helps prevent surprise breakdowns and expensive water heater repairs. It's a simple way to protect your comfort and extend the life of your system." ],
	'water-quality' => [ "WE CARE ABOUT CLEAN WATER TOO", "That's why we offer the No Drip Club—a comprehensive solution to ensure your water stays pure and safe, preventing and addressing water quality issues before they impact your home." ],
	'commercial'    => [ "WE HATE PLUMBING PROBLEMS TOO", "That's why we created COMMERCIAL PLUMBING EXPERTS, a comprehensive commercial plumbing solution that helps businesses maintain efficient operations through expert drain services, water heater installations, and specialized restaurant plumbing maintenance." ],
	'financing'               => [ "WE HATE SURPRISE BILLS TOO", "That's why we created the No Drip Club, a complete peace of mind solution that helps you avoid unexpected water quality issues and costly repairs. With flexible financing options, you can maintain your home's water systems without breaking the bank." ],
	// Sub-service pages
	'sewer-rodding'             => [ "Premium Protection with Our No Drip Club", "Our No Drip Club offers premium plumbing protection and added peace of mind for homeowners. Members enjoy priority scheduling and routine inspections to catch small issues before they become costly repairs." ],
	'clogged-drains-in-chicago' => [ "WE HATE CLOGS TOO", "That's why we created the No Drip Club, a complete peace of mind solution that helps prevent and address stubborn clogs before they disrupt your daily life." ],
	'water-heater-repair'       => [ "WE HATE COLD SHOWERS TOO", "That's why we created the No Drip Club, a complete peace of mind solution that helps you avoid those dreaded cold showers. Members receive priority scheduling and routine water heater inspections." ],
	'bathroom-plumbing-chicago' => [ "WE HATE BATHROOM HASSLES TOO", "That's why we created the No Drip Club, a complete peace of mind solution that helps you avoid bathroom plumbing headaches and save on unexpected repairs. From clogged drains to leaky faucets, we've got your bathroom covered." ],
];
$f2_title = $f2_map[ $slug ][0] ?? 'JOIN THE NO DRIP CLUB';
$f2_text  = $f2_map[ $slug ][1] ?? 'Our No Drip Club keeps your plumbing running smoothly all year long.';

// ─── Children (sub-services) ──────────────────────────────────────────────────
$children = get_posts( [
	'post_type'      => 'page',
	'post_status'    => 'publish',
	'post_parent'    => $post_id,
	'posts_per_page' => 30,
	'orderby'        => 'title',
	'order'          => 'ASC',
] );

// ─── Related articles (hardcoded map matching production GBP article selection) ─
$_article_map = [
	'sewer'                     => [ 1753, 1728, 1593 ],
	'water-heater'              => [ 1757, 1705, 1419 ],
	'water-quality'             => [ 1544, 1670, 1518 ],
	'water-heater-repair'       => [ 1549, 1971, 1870 ],
	'clogged-drains-in-chicago' => [ 1319, 1307, 1718 ],
	'sewer-rodding'             => [ 1960, 1317, 1333 ],
	'bathroom-plumbing-chicago' => [ 1826, 1679, 1835 ],
	'financing'                 => [ 1231, 1353, 1656 ],
];
if ( isset( $_article_map[ $slug ] ) ) {
	$articles = get_posts( [
		'post_type'   => 'jb_article',
		'post_status' => 'publish',
		'post__in'    => $_article_map[ $slug ],
		'orderby'     => 'post__in',
		'numberposts' => 3,
	] );
} else {
	$articles = jb_get_articles( $slug );
}
?>

<?php /* ──── HERO ──── */ ?>
<div class="hero">
	<img class="img-s" src="<?php echo esc_url( $hero_src ); ?>" alt="<?php echo esc_attr( $h1 ); ?>" />
	<div class="contents">
		<div class="w">
			<h1><?php echo esc_html( $h1 ); ?></h1>
			<p class="sub-label"></p>
			<?php if ( $hero_desc ) : ?>
			<p class="hero-desc"><?php echo esc_html( $hero_desc ); ?></p>
			<?php endif; ?>
			<a class="hero-link-button" href="tel:773-724-9272">
				<div>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 10.999h2C22 5.869 18.127 2 12.99 2v2C17.052 4 20 6.943 20 10.999"/><path fill="currentColor" d="M13 8c2.103 0 3 .897 3 3h2c0-3.225-1.775-5-5-5zm3.422 5.443a1 1 0 0 0-1.391.043l-2.393 2.461c-.576-.11-1.734-.471-2.926-1.66c-1.192-1.193-1.553-2.354-1.66-2.926l2.459-2.394a1 1 0 0 0 .043-1.391L6.859 3.513a1 1 0 0 0-1.391-.087l-2.17 1.861a1 1 0 0 0-.29.649c-.015.25-.301 6.172 4.291 10.766C11.305 20.707 16.323 21 17.705 21c.202 0 .326-.006.359-.008a1 1 0 0 0 .648-.291l1.86-2.171a1 1 0 0 0-.086-1.391z"/></svg>
				</div>
				<p>773-724-9272</p>
			</a>
		</div>
		<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/wrench_pattern.webp" alt="" />
	</div>
</div>

<?php get_template_part( 'template-parts/hero', 'nav' ); ?>

<div class="cream">
	<div class="w81 emergecy-plumbing">

		<?php /* Intro / benefits section */ ?>
		<div class="f">
			<div>
				<?php if ( $headline ) : ?>
				<p class="red-text"><?php echo esc_html( $headline ); ?></p>
				<?php else : ?>
				<p class="red-text">EXPERT <?php echo esc_html( strtoupper( get_the_title() ) ); ?> SOLUTIONS</p>
				<?php endif; ?>

				<img class="lazy" data-src="<?php echo esc_url( $f_img ); ?>" alt="<?php echo esc_attr( get_the_title() ); ?>" />

				<?php if ( $benefits ) : ?><div class="custom-paragraphs"><?php echo wp_kses_post( $benefits ); ?></div><?php endif; ?>
			</div>
			<img class="lazy" data-src="<?php echo esc_url( $f_img ); ?>" alt="<?php echo esc_attr( get_the_title() ); ?>" />
		</div>

		<?php /* Sub-services cards — hardcoded per category matching production */ ?>
		<?php
		$subservice_map = [
			'plumbing' => [
				[ 'Bathroom Plumbing',       'img_bathroom-plumbing.webp',            '/bathroom-plumbing-chicago',     'Professional Chicago plumbers offer comprehensive bathroom plumbing solutions from minor repairs to full remodels.' ],
				[ 'Kitchen Plumbing',        'img_kitchen_plumbing.webp',             '/kitchen-plumbing',              'We provide expert kitchen plumbing repairs and solutions for all your needs.' ],
				[ 'Laundry Room Plumbing',   'laundry-room-2.webp',                   '/laundry-room-plumbing',         'Professional plumbers offering comprehensive laundry room repairs and installations.' ],
				[ 'Gas Lines',               'img_gas-lines.webp',                    '/gas-lines-chicago',             'Expert gas line technicians provide emergency repairs and solutions for leaks and line issues.' ],
			],
			'sewer' => [
				[ 'Sewer Rodding',           'img_sewer-rodding.webp',                '/sewer-rodding',                 'We provide emergency sewer rodding to quickly clear blocked drains and sewage backups.' ],
				[ 'Sewer Repair',            'img_sewer-repair.webp',                 '/sewer-repair',                  'Professional sewer repair services transform emergencies into permanent solutions.' ],
				[ 'Sewer Maintenance',       'img_sewer-maintenance.webp',            '/sewer-maintenance',             'We provide expert sewer line maintenance to address slow drains, odors, and clogs.' ],
				[ 'Home Repipe',             'img_home-repipe.webp',                  '/home-repipe',                   'Professional plumbers provide comprehensive home repiping services and system upgrades.' ],
			],
			'drain' => [
				[ 'Clogged Drains',          'img_clogged-drains.webp',               '/clogged-drains-in-chicago',     'We quickly clear all types of clogged drains in Chicago.' ],
				[ 'Basement Flooding',       'Basement-flooding.webp',                '/basement-flooding',             'We provide emergency response services to handle basement flooding and restore your space.' ],
				[ 'Kitchen Sink Drain',      'Kitchen-Sink-Drain.webp',               '/kitchen-sink-drain',            'Professional plumbers fix kitchen sink drain problems to restore normal function.' ],
			],
			'water-heater' => [
				[ 'Residential Water Heater','img_residential-water-heater.webp',     '/residential-water-heater',      'We provide rapid water heater repairs and installations to restore your hot water.' ],
				[ 'Tankless Water Heater',   'img_tankless-water-heater.webp',        '/tankless-water-heater',         'We offer professional tankless water heater repairs and maintenance to keep your hot water flowing.' ],
				[ 'Commercial Water Heater', 'img_commercial-water-heater.webp',      '/commercial-water-heater',       'Expert commercial water heater repair and installation services for businesses.' ],
			],
			'water-quality' => [
				[ 'Water Filtration Systems','img_water-filtration-system.webp',      '/water-filtration-systems',      'Expert water filtration installation transforms tap water into clean, healthy drinking water.' ],
			],
			'commercial' => [
				[ 'Commercial Jetting',         'Commercial+Jetting+copy.webp',         '/commercial-jetting',            '' ],
				[ 'Commercial Drain Service',   'drain-hero.webp',                      '/commercial-drain-service',      '' ],
				[ 'Commercial Water Heater',    'img_commercial-water-heater.webp',     '/commercial-water-heater',       '' ],
				[ 'Restaurant Plumbing Service','img_restaurant-plumbing-services.webp','/restaurant-plumbing-services',  '' ],
				[ 'Restaurant Drain Clearing',  'sewer.webp',                           '/restaurant-drain-clearing',     '' ],
				[ 'Restaurant Water Heater',    'commercial-water-heater.webp',         '/restaurant-water-heater',       '' ],
			],
			'bathroom-plumbing-chicago' => [
				[ 'Bathroom Remodel',              'after.jpg',                              '/bathroom-remodel',                      'We offer premium bath remodeling services with custom designs and elegant fixtures, completed in two days.' ],
				[ 'Faucet Installation & Repair',  'Kitchen-Faucet-Install.webp',            '/faucet-installation-repair',            'Professional faucet installation and repair services turn plumbing problems into solutions.' ],
				[ 'Shower Repair',                 'img_shower-repair.webp',                 '/shower-repair',                         'We provide expert shower repair services to fix your shower problems quickly.' ],
				[ 'Toilet Installation & Repair',  'img_toilet-installation-repair.webp',    '/toilet-installation-repair',            'We provide expert toilet installation and repair services for all your bathroom plumbing needs.' ],
			],
			'kitchen-plumbing' => [
				[ 'Kitchen Faucet Repair & Installation',   'Kitchen-Faucet-Install.webp',           '/kitchen-faucet-repair-and-installation', '' ],
				[ 'Garbage Disposal Repair & Installation', 'img_garbage-disposal.webp',             '/garbage-disposal-installation-repair',   '' ],
			],
			'sewer-rodding' => [
				[ 'Drain Cleaning', 'image14.webp',         '/drain-cleaning-services-in-chicago',  'Professional drain cleaning services in Chicago transform drainage problems into lasting solutions.' ],
				[ 'Hydro Jetting',  'img_hydro-jetting.webp','/hydro-jetting',                      'Professional hydro jetting service eliminates stubborn pipe blockages quickly and effectively.' ],
			],
			'residential-water-heater' => [
				[ 'Water Heater Maintenance',   'img_water-heater-maintenance.webp',  '/water-heater-maintenance',  '' ],
				[ 'Water Heater Installation',  'img_water-heater-installation.webp', '/water-heater-installation', '' ],
				[ 'Water Heater Repair',        'img_water-heater-repair.webp',       '/water-heater-repair',       '' ],
			],
		];
		$subcards = $subservice_map[ $slug ] ?? [];
		?>
		<div class="ep-card ndc-section">
			<img class="ndc lazy" data-src="<?php echo esc_url( $cf . 'no-drip-club.webp' ); ?>" alt="NDC" />
			<div>
				<img class="lazy char" data-src="<?php echo esc_url( $cf . 'jbcharacter.webp' ); ?>" alt="Character" />
				<div class="a">
					<div class="l"></div>
					<div class="r">
						<?php if ( $ndc_text ) :
							preg_match( '/<p[^>]*class=["\'\']label["\'\'][^>]*>(.*?)<\/p>/s', $ndc_text, $lm );
							$ndc_label = $lm[1] ?? '';
							preg_match_all( '/<li>(.*?)<\/li>/s', $ndc_text, $li_m );
							$ndc_items = $li_m[1] ?? [];
							$chk = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="none" fill-rule="evenodd"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"/><path fill="currentColor" d="M21.546 5.111a1.5 1.5 0 0 1 0 2.121L10.303 18.475a1.6 1.6 0 0 1-2.263 0L2.454 12.89a1.5 1.5 0 1 1 2.121-2.121l4.596 4.596L19.424 5.111a1.5 1.5 0 0 1 2.122 0"/></g></svg>';
						?>
							<?php if ( $ndc_label ) : ?><p class="label"><?php echo esc_html( $ndc_label ); ?></p><?php endif; ?>
							<?php foreach ( $ndc_items as $ndc_item ) : ?>
							<div class="service"><div><?php echo $chk; ?></div><p><?php echo esc_html( strip_tags( $ndc_item ) ); ?></p></div>
							<?php endforeach; ?>
						<?php else : ?>
						<p class="label">JOIN THE NO DRIP CLUB</p>
						<p>Members save 10% on all services, get priority scheduling, and enjoy free annual maintenance — all for just $29.97/month.</p>
						<?php endif; ?>
						<a class="link-button" href="tel:773-724-9272">MAKE A GOOD CALL</a>
					</div>
				</div>
			</div>
		</div>

		<?php if ( ! empty( $subcards ) ) : ?>
		<div class="ep-subcategories">
			<?php if ( $headline2 ) : ?>
			<p class="red-text"><?php echo esc_html( $headline2 ); ?></p>
			<?php else : ?>
			<p class="red-text">Explore More <?php echo esc_html( $slug ); ?> Solutions</p>
			<?php endif; ?>
			<div class="services">
			<?php foreach ( $subcards as $sc ) : ?>
			<div class="card">
				<img class="lazy" data-src="<?php echo esc_url( $cf . $sc[1] ); ?>" alt="<?php echo esc_attr( $sc[0] ); ?>" />
				<div>
					<p class="label"><?php echo esc_html( $sc[0] ); ?></p>
					<?php if ( ! empty( $sc[3] ) ) : ?>
					<p class="desc"><?php echo esc_html( $sc[3] ); ?></p>
					<?php endif; ?>
					<a href="<?php echo esc_url( home_url( $sc[2] ) ); ?>">
						<p>Read more</p>
						<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"/></svg>
					</a>
				</div>
			</div>
			<?php endforeach; ?>
			</div>
		</div>
		<?php /* NDC section */ ?>
		<?php if ( $slug === 'water-heater' ) : ?>
		<div class="ep-new-section">
			<p class="red-text">Professional Water Heater Installation Done Right</p>
			<p>When a system reaches the end of its lifespan, a new installation may be the smarter choice. Our team helps you choose the right unit for your home and usage needs.</p>
			<p>Every water heater installation is completed to code, with careful attention to safety and efficiency. We also remove old units and test everything before we leave.</p>
		</div>
		<?php elseif ( $slug === 'sewer-rodding' ) : ?>
		<div class="ep-new-section">
			<p class="red-text">Professional Sewer Line Installation Done Right</p>
			<p>In some cases, sewer rodding reveals that aging or damaged pipes are beyond repair. When that happens, a new sewer line installation may be the most reliable solution.</p>
			<p>Our plumbers walk you through your options and explain when replacement makes more sense than repeated sewer rodding services.</p>
			<p>We install durable, code-compliant piping designed to last for decades. Even when installation is needed, our rodding services help identify the exact problem area first.</p>
		</div>
		<?php endif; ?>

		<?php endif; ?>

		<?php /* Locations map */ ?>
		<div class="ep-map">
			<div class="ep-contents">
				<div class="map2">
					<div class="elfsight-app-9da0734e-a27e-4557-85a0-da9b69617829" data-elfsight-app-lazy></div>
				</div>
				<p class="red-text">WE'RE ALMOST EVERYWHERE</p>
				<p>With more plumbers and more trucks at our disposal, we can cover more ground and reach your home quickly.</p>
			</div>
			<div class="map1">
				<div class="elfsight-app-9da0734e-a27e-4557-85a0-da9b69617829" data-elfsight-app-lazy></div>
			</div>
		</div>

		<?php /* Google reviews */ ?>
		<div class="ep-gr">
			<div class="elfsight-app-67911321-4b72-4209-b157-fc9812eadd3b" data-elfsight-app-lazy></div>
		</div>

		<?php /* TikTok section */ ?>
		<p class="ep-tiktok-headline">J Blanton Plumbing - Turning Bad Calls to Good Calls</p>
		<div class="ep-tiktok">
			<div class="elfsight-app-9f370c11-108b-412b-8529-6b3f093f04a3" data-elfsight-app-lazy></div>
		</div>

		<?php /* F2 - No Drip Club pitch */ ?>
		<div class="f2">
			<div>
				<p class="red-text"><?php echo esc_html( $f2_title ); ?></p>
				<img class="lazy" data-src="<?php echo esc_url( $cf . 'preventative.webp' ); ?>" alt="<?php echo esc_attr( get_the_title() ); ?>" />
				<p><?php echo esc_html( $f2_text ); ?></p>
				<a class="link-button" href="<?php echo esc_url( home_url('/no-drip-club') ); ?>">JOIN NOW</a>
			</div>
			<img class="lazy" data-src="<?php echo esc_url( $cf . 'preventative.webp' ); ?>" alt="<?php echo esc_attr( get_the_title() ); ?>" />
		</div>

		<?php if ( $slug === 'water-heater' ) : ?>
		<div class="ep-new-section">
			<p class="red-text">Prevent Problems Before They Start</p>
			<p>Routine maintenance plays a key role in water heater performance. Small issues can often be caught early, reducing the need for emergency water heater repair later on.</p>
			<p>With our maintenance services, we work to keep your hot water reliable and efficient.</p>
		</div>
		<?php elseif ( $slug === 'sewer-rodding' ) : ?>
		<div class="ep-new-section">
			<p class="red-text">Preventive Maintenance for Healthier Sewer Lines</p>
			<p>Routine maintenance can significantly reduce the need for emergency sewer rodding.</p>
			<p>Regular inspections and drain cleaning help prevent debris buildup and root intrusion. Addressing small issues early minimizes the chances of needing rodding a blocked drain unexpectedly. Preventive rodding services also extend the life of your sewer system.</p>
			<p>A little maintenance now can save you from major sewer rodding services later.</p>
		</div>
		<?php endif; ?>
		<?php /* Articles */ ?>
		<?php if ( ! empty( $articles ) ) : ?>
		<div class="page-articles">
		<div class="articles-component">
			<?php foreach ( $articles as $article ) :
				$thumb = get_post_meta( $article->ID, 'article_image', true ) ?: $cf . 'hero_image.webp';
			?>
			<div class="article-card">
				<img class="lazy" data-src="<?php echo esc_url( $thumb ); ?>" alt="<?php echo esc_attr( $article->post_title ); ?>" />
				<div>
					<p class="article-title"><?php echo esc_html( $article->post_title ); ?></p>
					<?php
					// Match production Go backend: title + body merged (no space), full first paragraph
					$_raw   = $article->post_content;
					$_parts = explode( '</p>', $_raw );
					$_first = $_parts[0] ?? $_raw;
					$_first = str_replace( '<p>', '', $_first );
					$_first = str_replace( '</h1><br /><br />', '', $_first );
					$_first = str_replace( '</h1><br/><br/>', '', $_first );
					$_first = str_replace( '<h1>', '', $_first );
					$_first = wp_strip_all_tags( $_first );
					$_first = trim( preg_replace( '/\s+/', ' ', $_first ) );
					$_svc_excerpt = $_first;
					?>
					<p><?php echo esc_html( $_svc_excerpt ); ?></p>
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

		<?php /* Final pitch */ ?>
		<div class="f3<?php if ( in_array( $slug, [ 'water-heater', 'sewer-rodding', 'gas-line-repair', 'home-repipe', 'sewer-maintenance-service', 'trenchless-water-line-replacement' ] ) ) echo ' f3-left'; ?>">
			<img class="lazy" data-src="<?php echo esc_url( $f3_img ); ?>" alt="Plumbing" />
			<div>
				<?php if ( $final_tagline ) : ?>
				<p class="red-text"><?php echo esc_html( $final_tagline ); ?></p>
				<?php else : ?>
				<p class="red-text">TURN A <?php echo esc_html( strtoupper( get_the_title() ) ); ?> PROBLEM INTO A PERFECT SOLUTION</p>
				<?php endif; ?>
				<img class="lazy" data-src="<?php echo esc_url( $f3_img ); ?>" alt="Plumbing" />
				<?php if ( $final_text ) : ?>
					<?php echo wp_kses_post( $final_text ); ?>
				<?php else : ?>
				<p>What are you waiting for? The sooner you call, the sooner we'll be there.</p>
				<?php endif; ?>
				<a class="link-button button1" href="tel:773-724-9272">MAKE A GOOD CALL</a>
			</div>
		</div>

	</div>
</div>

<?php endwhile; endif; ?>
<?php get_footer(); ?>
