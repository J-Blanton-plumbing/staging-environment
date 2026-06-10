<?php

// Convert post slug to short display name matching production
function jb_slug_to_short_name( $slug ) {
	// Special cases where slug differs from production display name
	$overrides = [
		'video-camera-sewer-inspections' => 'Video Camera Sewer & Drain Inspections',
	];
	if ( isset( $overrides[ $slug ] ) ) {
		return $overrides[ $slug ];
	}
	$slug = str_replace( ['installation-and-repair', 'installation-repair'], 'installation & repair', $slug );
	$slug = str_replace( '-and-', ' & ', $slug );
	$slug = str_replace( '-', ' ', $slug );
	return ucwords( $slug );
}
/**
 * Template Name: City Page v2
 * Used for Evanston, Northbrook, and Elmhurst — video hero + city2.0 layout.
 */
get_header();

if ( have_posts() ) : while ( have_posts() ) : the_post();

$post_id = get_the_ID();
$slug    = get_post_field( 'post_name', $post_id );
$cf      = 'https://d1rplazj5a80fb.cloudfront.net/images/';

// ─── ACF fields ───────────────────────────────────────────────────────────────
$geo          = get_field( 'city_name' )    ?: get_the_title();
$gbp          = get_field( 'gbp' )          ?: $geo;
$callout      = get_field( 'city_callout' ) ?: '';
$city_content = get_field( 'city_content' ) ?: '';

// ─── Content image per city ───────────────────────────────────────────────────
$content_images = [
    'evanston'  => 'Zana+Northwestern.webp',
    'northbrook'=> 'northbrook.webp',
    'elmhurst'  => 'wp-content/uploads/2019/11/Plumbing-Rough-In-800x600.jpg',
];
$raw_img = get_field( 'category_image' ) ?: get_field( 'hero_image' ) ?: '';
if ( ! empty( $raw_img ) && strpos( $raw_img, 'vid_' ) === false ) {
    if ( strpos( $raw_img, 'wp-content' ) !== false ) {
        $parts = explode( 'wp-content', $raw_img );
        $content_img = $cf . 'wp-content' . end( $parts );
    } elseif ( strpos( $raw_img, 'http' ) === 0 ) {
        $content_img = $raw_img;
    } else {
        $content_img = $cf . ltrim( $raw_img, '/' ) . ( strpos( $raw_img, '.' ) === false ? '.webp' : '' );
    }
} else {
    $content_img = $cf . ( $content_images[ $slug ] ?? 'preventative.webp' );
}

// ─── Video hero per city ──────────────────────────────────────────────────────
$video_map = [
    'evanston'  => [ 'src' => 'https://d1rplazj5a80fb.cloudfront.net/videos/evanston-hero-horizontal.mp4',  'poster' => $cf . 'tumbh2.webp' ],
    'northbrook'=> [ 'src' => 'https://d1rplazj5a80fb.cloudfront.net/videos/Northbrook+Header+Video.mp4',   'poster' => $cf . 'tumbh3.webp' ],
    'elmhurst'  => [ 'src' => '',                                                                            'poster' => $cf . 'wp-content/uploads/2019/11/Plumbing-Rough-In-800x600.jpg' ],
];
$video = $video_map[ $slug ] ?? [ 'src' => '', 'poster' => $cf . 'hero_image.webp' ];

// ─── Elfsight reviews per city ────────────────────────────────────────────────
$reviews_map = [
    'evanston'  => '37a7d292-8861-4ea3-9680-c342123c50bc',
    'northbrook'=> '37a7d292-8861-4ea3-9680-c342123c50bc',
    'elmhurst'  => '269bffb8-d3db-4476-ba58-616ab4849cec',
];
$elfsight_reviews_id = get_field( 'elfsight_reviews_id' )
    ?: ( $reviews_map[ $slug ] ?? '266c99c1-530c-4f93-8046-bab90e4a05e5' );

// ─── Service category grouping ────────────────────────────────────────────────
$service_categories = [
    'Plumbing' => [
        'icon' => 'u_shape_tube.svg',
        'slugs'=> ['burst-pipe','faucet','garbage-disposal','kitchen-faucet','kitchen-plumbing','leak','plumbing-fixture','plumbing-maintenance','shower-repair','toilet','emergency-plumbing'],
    ],
    'Gas Lines' => [
        'icon' => 'boiler.svg',
        'slugs'=> ['gas-fireplace','gas-line'],
    ],
    'Water Filtration Systems' => [
        'icon' => 'water_droplet.svg',
        'slugs'=> ['water-filtration','water-testing','water-quality'],
    ],
    'Water Heater Services' => [
        'icon' => 'waterfaucet.svg',
        'slugs'=> ['water-heater','tankless'],
    ],
    'Sewer &amp; Drain' => [
        'icon' => 'sink.svg',
        'slugs'=> ['sewer','drain','clogged','basement','catch-basin','ejector','hydro-jetting','overhead','sump','trenchless'],
    ],
];

$children = get_posts( [
    'post_type'      => 'page',
    'post_status'    => 'publish',
    'post_parent'    => $post_id,
    'posts_per_page' => 200,
    'orderby'        => 'title',
    'order'          => 'ASC',
] );

// Slugs that exist as child pages but are not shown in production service list
$slug_exclude = [
    'bathroom-plumbing',
    'drain-camera-inspection',
    'flood-control-maintenance',
    'gas-lines',
    'plumbing-services',
];

// Build categorised list
$categorised = array_fill_keys( array_keys( $service_categories ), [] );
$other       = [];
foreach ( $children as $child ) {
    $child_slug = $child->post_name;
    if ( in_array( $child_slug, $slug_exclude, true ) ) {
        continue;
    }
    $matched    = false;
    foreach ( $service_categories as $cat_name => $cat ) {
        foreach ( $cat['slugs'] as $keyword ) {
            if ( strpos( $child_slug, $keyword ) !== false ) {
                $categorised[ $cat_name ][] = $child;
                $matched = true;
                break 2;
            }
        }
    }
    if ( ! $matched ) {
        $other[] = $child;
    }
}

// ─── Articles ─────────────────────────────────────────────────────────────────
$articles = get_posts( [ 'post_type' => 'jb_article', 'post_status' => 'publish', 'numberposts' => 3, 'category_name' => $slug ] );
if ( empty( $articles ) ) {
    $articles = get_posts( [ 'post_type' => 'jb_article', 'post_status' => 'publish', 'numberposts' => 3 ] );
}
?>

<div class="test2-hero">
	<video class="hero2-video-desktop"
		src="<?php echo esc_url( $video['src'] ); ?>"
		poster="<?php echo esc_url( $video['poster'] ); ?>"
		loop autoplay muted playsinline>
		Video not supported on your browser.
	</video>
	<div class="test2-hero-body">
		<div class="test2-hero-contents">
			<div class="l">
				<img class="lazy hero-home24-7" data-src="<?php echo esc_url( $cf . 'home/247.webp' ); ?>" alt="24/7" />
				<h1><?php echo esc_html( strtoupper( $geo ) ); ?> PLUMBING EXPERTS<br /><a href="tel:773-724-9272">MAKE A GOOD CALL!</a></h1>
				<?php if ( $slug === 'evanston' ) : ?>
				<h1>PROUDLY SERVING <?php echo esc_html( strtoupper( $geo ) ); ?> FOR OVER 30 YEARS</h1>
				<?php else : ?>
				<h1>PROUDLY SERVING <?php echo esc_html( strtoupper( $geo ) ); ?> FOR OVER 30 YEARS!</h1>
				<?php endif; ?>
			</div>
			<div class="r">
				<?php if ( $slug === 'evanston' ) : ?>
				<p class="intro">Evanston is where you call home, and when plumbing issues like a burst pipe or a flooded kitchen arise, it can feel overwhelming. At J. Blanton Plumbing, we&#8217;re proud to serve our fellow Evanston residents with fast, expert solutions that restore comfort and peace to your home.</p>
				<?php elseif ( $slug === 'northbrook' ) : ?>
				<p class="intro">When plumbing problems strike in Northbrook, whether it&#8217;s a burst pipe or a flooded kitchen, it can disrupt your entire day. At J. Blanton Plumbing, we&#8217;re headquartered here for our Northbrook neighbors, providing quick and professional plumbing services to get your home back to normal as fast as possible.</p>
				<a class="test2-hero-contact" href="tel:773-724-9272">
					<div><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 15.5c-1.2 0-2.5-.2-3.6-.6h-.3c-.3 0-.5.1-.7.3l-2.2 2.2c-2.8-1.5-5.2-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1c-.3-1.1-.5-2.4-.5-3.6c0-.5-.5-1-1-1H4c-.5 0-1 .5-1 1c0 9.4 7.6 17 17 17c.5 0 1-.5 1-1v-3.5c0-.5-.5-1-1-1"/></svg></div>
					<p>773-724-9272</p>
				</a>
				<?php elseif ( $slug === 'elmhurst' ) : ?>
				<p class="intro">When plumbing problems strike in Elmhurst, whether it&#8217;s a burst pipe or a flooded kitchen, it can disrupt your entire day. At J. Blanton Plumbing, we&#8217;re headquartered here for our Elmhurst neighbors, providing quick and professional plumbing services to get your home back to normal as fast as possible.</p>
				<a class="test2-hero-contact" href="tel:773-724-9272">
					<div><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 15.5c-1.2 0-2.5-.2-3.6-.6h-.3c-.3 0-.5.1-.7.3l-2.2 2.2c-2.8-1.5-5.2-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1c-.3-1.1-.5-2.4-.5-3.6c0-.5-.5-1-1-1H4c-.5 0-1 .5-1 1c0 9.4 7.6 17 17 17c.5 0 1-.5 1-1v-3.5c0-.5-.5-1-1-1"/></svg></div>
					<p>773-724-9272</p>
				</a>
				<?php else : ?>
				<p class="intro"><?php echo esc_html( $geo ); ?> is where you call home, and when plumbing issues arise, J. Blanton Plumbing is here to help with fast, expert solutions that restore comfort and peace to your home.</p>
				<a class="test2-hero-contact" href="tel:773-724-9272">
					<div><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 15.5c-1.2 0-2.5-.2-3.6-.6h-.3c-.3 0-.5.1-.7.3l-2.2 2.2c-2.8-1.5-5.2-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1c-.3-1.1-.5-2.4-.5-3.6c0-.5-.5-1-1-1H4c-.5 0-1 .5-1 1c0 9.4 7.6 17 17 17c.5 0 1-.5 1-1v-3.5c0-.5-.5-1-1-1"/></svg></div>
					<p>773-724-9272</p>
				</a>
				<?php endif; ?>
			</div>
		</div>
	</div>
</div>

<?php get_template_part( 'template-parts/hero', 'nav' ); ?>

<div class="cream">
	<div class="city-page-content">
		<div class="f">
			<div class="l">
				<?php if ( $slug === 'elmhurst' ) : ?>
			<p class="red-text">WE'VE GOT YOU COVERED, <span><?php echo esc_html( $geo ); ?></span></p>
			<?php else : ?>
			<p class="red-text">WHY J. BLANTON FOR <?php echo esc_html( strtoupper( $geo ) ); ?> PLUMBING</p>
			<?php endif; ?>
				<img class="lazy" data-src="<?php echo esc_url( $content_img ); ?>" alt="<?php echo esc_attr( $geo ); ?>" />
				<?php if ( $city_content ) : ?>
					<?php echo wp_kses_post( $city_content ); ?>
				<?php else : ?>
					<p>At J. Blanton Plumbing, we've been <?php echo esc_html( $geo ); ?>'s trusted local experts for over 30 years, delivering fast, reliable solutions for everything from clogged drains to emergency repairs. Our Illinois-certified plumbers offer same-day service, upfront pricing, and professional care.</p>
				<?php endif; ?>
			</div>
			<img class="lazy" data-src="<?php echo esc_url( $content_img ); ?>" alt="<?php echo esc_attr( $geo ); ?>" />
		</div>

		<div class="image-container">
			<img class="background-image" src="<?php echo esc_url( $cf . 'downtown-floating.png' ); ?>" alt="Background Image" />
		</div>

		<div class="services-menu">
			<p class="red-text2">OUR SERVICES</p>
			<div class="city-sub-categories">
				<div class="services-row">
					<?php foreach ( $categorised as $cat_name => $cat_children ) :
						if ( empty( $cat_children ) ) continue;
						$cat_icon = $service_categories[ $cat_name ]['icon'] ?? 'u_shape_tube.svg';
					?>
					<details class="service-category">
						<summary>
							<img class="icon-text" alt="<?php echo esc_attr( html_entity_decode( $cat_name ) ); ?>" src="<?php echo esc_url( $cf . $cat_icon ); ?>" />
							<?php echo wp_kses_post( $cat_name ); ?>
						</summary>
						<ul>
							<?php foreach ( $cat_children as $child ) : ?>
							<li><a href="<?php echo esc_url( get_permalink( $child->ID ) ); ?>"><?php echo esc_html( jb_slug_to_short_name( $child->post_name ) ); ?></a></li>
							<?php endforeach; ?>
						</ul>
					</details>
					<?php endforeach; ?>
					<?php if ( ! empty( $other ) ) : ?>
					<details class="service-category">
						<summary>
							<img class="icon-text" alt="Other" src="<?php echo esc_url( $cf . 'u_shape_tube.svg' ); ?>" />
							Other Services
						</summary>
						<ul>
							<?php foreach ( $other as $child ) : ?>
							<li><a href="<?php echo esc_url( get_permalink( $child->ID ) ); ?>"><?php echo esc_html( jb_slug_to_short_name( $child->post_name ) ); ?></a></li>
							<?php endforeach; ?>
						</ul>
					</details>
					<?php endif; ?>
				</div>
			</div>
		</div>

		<div class="evanston-reviews">
			<div class="elfsight-app-<?php echo esc_attr( $elfsight_reviews_id ); ?>" data-elfsight-app-lazy></div>
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

		<?php if ( $slug !== 'elmhurst' ) : ?>
		<p class="ep-tiktok-headline">J Blanton Plumbing - Turning Bad Calls to Good Calls</p>
		<div class="city-social-media">
			<div class="elfsight-app-9f370c11-108b-412b-8529-6b3f093f04a3" data-elfsight-app-lazy></div>
		</div>
		<?php endif; ?>

		<?php if ( ! empty( $articles ) ) : ?>
		<div class="city-articles">
			<div class="articles-component">
				<?php foreach ( $articles as $article ) :
					$thumb = get_post_meta( $article->ID, "article_image", true ) ?: $cf . "hero_image.webp";
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

		<?php if ( $slug !== 'elmhurst' ) : ?>
		<?php
		// FAQs
		$faqs = get_posts( [
			'post_type'      => 'jb_faq',
			'post_status'    => 'publish',
			'posts_per_page' => 5,
		] );
		?>
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
		<?php endif; // not elmhurst ?>

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
