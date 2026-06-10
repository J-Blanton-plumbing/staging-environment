<?php get_header(); ?>

<?php
// --- 2026-04-20: ACF overrides for homepage. Empty fields → original strings. ---
$hero_heading     = get_field( 'hero_heading' )     ?: 'PLUMBING EXPERTS';
$hero_subheading  = get_field( 'hero_subheading' )  ?: 'PROUDLY SERVING CHICAGO AND SUBURBS FOR OVER 30 YEARS';
$hero_description = get_field( 'hero_description' ) ?: 'Home is where life happens, but unexpected disruptions like a burst pipe or a kitchen flood can shatter the peace. When the unexpected strikes, trust J. Blanton Plumbing to be there.';
$hero_poster_src  = jb_resolve_hero_image( get_field( 'hero_image_override' ), 'https://d1rplazj5a80fb.cloudfront.net/images/tumbh1.webp' );

$home_services_intro = get_field( 'home_services_intro' ) ?: 'Our team of tenacious plumbers are always ready to leap into action to save your day, no matter how light or severe the situation.';
$home_whyjb_text_1   = get_field( 'home_whyjb_text_1' )   ?: '<p>At J Blanton, we understand the importance of an owner\'s home. We know that when disaster strikes, you need more than just a plumber; you need a problem solver who can bring fast relief to unexpected chaos.</p>';
$home_whyjb_text_2   = get_field( 'home_whyjb_text_2' )   ?: '<p>For more than 30 years, our professionals have raced through heat, rain, snow, and hail to restore order and peace back into the homes of many Chicagoland families.</p>';
$home_ndc_text       = get_field( 'home_ndc_text' )       ?: '<p>There are Good Calls—and then there\'s the No Drip Club. Members enjoy significant annual savings on home checkups, emergency repairs, and unlock exclusive perks, including VIP treatment whenever they call for service.</p>';
$home_kb_text        = get_field( 'home_kb_text' )        ?: 'Check out the knowledge hub for FAQ\'s and helpful tips on all things plumbing.';
$home_findus_text_1  = get_field( 'home_findus_text_1' )  ?: 'We\'ve proudly served the Chicagoland area for 30+ years.';
$home_findus_text_2  = get_field( 'home_findus_text_2' )  ?: 'Contact us or use the site map to find the location that\'s nearest to you.';
?>

<div class="test-hero">
	<video
		class="hero-video-desktop"
		src="https://d1rplazj5a80fb.cloudfront.net/videos/chicago-plumbing2.webm"
		poster="<?php echo esc_url( $hero_poster_src ); ?>"
		loop autoplay muted playsinline>
		Video not supported on your browser.
	</video>

	<div class="test-hero-body">
		<div class="test-hero-contents">
			<div class="l">
				<img class="lazy hero-home24-7" data-src="https://d1rplazj5a80fb.cloudfront.net/images/home/247.webp" alt="24/7" />
				<h1><?php echo esc_html( $hero_heading ); ?><br /><a href="tel:773-724-9272">MAKE A GOOD CALL!</a></h1>
				<h1><?php echo esc_html( $hero_subheading ); ?></h1>
			</div>
			<div class="r">
				<p class="intro"><?php echo esc_html( $hero_description ); ?></p>
				<a class="test-hero-contact" href="tel:773-724-9272">
					<div>
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 15.5c-1.2 0-2.5-.2-3.6-.6h-.3c-.3 0-.5.1-.7.3l-2.2 2.2c-2.8-1.5-5.2-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1c-.3-1.1-.5-2.4-.5-3.6c0-.5-.5-1-1-1H4c-.5 0-1 .5-1 1c0 9.4 7.6 17 17 17c.5 0 1-.5 1-1v-3.5c0-.5-.5-1-1-1M5 5h1.5c.1.9.3 1.8.5 2.6L5.8 8.8C5.4 7.6 5.1 6.3 5 5m14 14c-1.3-.1-2.6-.4-3.8-.8l1.2-1.2c.8.2 1.7.4 2.6.4z"/></svg>
					</div>
					<p>773-724-9272</p>
				</a>
			</div>
		</div>
	</div>
</div>

<div class="hero-nav">
	<a href="<?php echo esc_url(home_url('/emergency-plumbing')); ?>">EMERGENCY PLUMBING</a>
	<a href="<?php echo esc_url(home_url('/knowledge-hub')); ?>">KNOWLEDGE HUB</a>
	<a href="<?php echo esc_url(home_url('/financing')); ?>">FINANCING</a>
	<a href="<?php echo esc_url(home_url('/no-drip-club')); ?>">HELP &amp; SUPPORT</a>
</div>

<div class="home-services-bg">
	<div class="home-services w81">
		<div class="align1">
			<p class="red-text">SERVICES</p>
			<div>
				<p><?php echo esc_html( $home_services_intro ); ?></p>
				<a class="link-button" href="<?php echo esc_url(home_url('/services')); ?>">VIEW PAGE</a>
			</div>
		</div>

		<!-- Services Grid -->
		<div class="services">
			<div class="services-contents-mobile">
				<?php
				$services = [
					['Emergency',    'We offer fast drain and plumbing services for emergencies.',                     'phone',         'emergency-plumbing'],
					['Plumbing',     'Our Illinois-certified plumbers are trained and skilled for complex plumbing tasks.', 'u_shape_tube', 'plumbing'],
					['Sewer',        'Sewer services ensure clogs are resolved and plumbing stays smooth.',            'home',          'sewer'],
					['Drain',        'Drain services keep your home\'s plumbing running smoothly.',                   'sink',          'drain'],
					['Water Heater', 'Ensure consistent hot water with J. Blanton Plumbing\'s.',                      'waterfaucet',   'water-heater'],
					['Water Quality','Water filtration ensures clean, safe water and protects your health and plumbing.','water_droplet','water-quality'],
					['Commercial',   'Reliable and efficient plumbing solutions tailored to meet the needs of your business.', 'commercial', 'commercial'],
				];
				foreach ($services as $i => $s) {
					echo '<div class="service-card not-active">';
					echo '<div id="inner' . $i . '">';
					echo '<div id="service-header' . $i . '" class="service-header"><p class="service-label">' . esc_html($s[0]) . '</p>';
					echo '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m19 9l-7 6l-7-6"/></svg></div>';
					echo '<p>' . esc_html($s[1]) . '</p>';
					echo '<a href="' . esc_url(home_url('/' . $s[3])) . '"><p>Read more</p><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m22 6l8 10l-8 10m8-10H2"/></svg></a>';
					echo '</div></div>';
				}
				?>
				<a class="link-button" href="<?php echo esc_url(home_url('/services')); ?>">VIEW ALL SERVICES</a>
			</div>

			<div class="services-contents">
				<?php foreach ($services as $s) { ?>
				<div class="image-card">
					<div class="img">
						<?php if ($s[2] === 'commercial'): ?>
							<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M176 416v64M80 32h192a32 32 0 0 1 32 32v412a4 4 0 0 1-4 4H48h0V64a32 32 0 0 1 32-32m240 160h112a32 32 0 0 1 32 32v256h0h-160h0V208a16 16 0 0 1 16-16"/><path fill="currentColor" d="M98.08 431.87a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m80 240a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m80 320a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79"/><ellipse cx="256" cy="176" fill="currentColor" rx="15.95" ry="16.03" transform="rotate(-45 255.99 175.996)"/><path fill="currentColor" d="M258.08 111.87a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79M400 400a16 16 0 1 0 16 16a16 16 0 0 0-16-16m0-80a16 16 0 1 0 16 16a16 16 0 0 0-16-16m0-80a16 16 0 1 0 16 16a16 16 0 0 0-16-16m-64 160a16 16 0 1 0 16 16a16 16 0 0 0-16-16m0-80a16 16 0 1 0 16 16a16 16 0 0 0-16-16m0-80a16 16 0 1 0 16 16a16 16 0 0 0-16-16"/></svg>
						<?php else: ?>
							<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/<?php echo esc_attr($s[2]); ?>.svg" alt="<?php echo esc_attr($s[0]); ?>" />
						<?php endif; ?>
					</div>
					<div class="image-card-content">
						<p class="service-label"><?php echo esc_html($s[0]); ?></p>
						<p class="desc"><?php echo esc_html($s[1]); ?></p>
						<a href="<?php echo esc_url(home_url('/' . $s[3])); ?>">
							<p>Read more</p>
							<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"/></svg>
						</a>
					</div>
				</div>
				<?php } ?>
			</div>
		</div>

		<script>
		(() => {
			const serviceCard = document.querySelectorAll(".service-card");
			serviceCard.forEach((v, i) => {
				const inner = document.getElementById(`inner${i}`);
				const serviceHeader = document.getElementById(`service-header${i}`);
				let serviceHeaderClicked = false;
				v.addEventListener("click", () => {
					if(v.classList.contains("active") || serviceHeaderClicked) { serviceHeaderClicked = false; return; }
					v.classList.add("active"); v.classList.remove("not-active");
					v.style.height = `${inner.offsetHeight}px`;
				});
				serviceHeader.addEventListener("click", () => {
					if(!v.classList.contains("active")) return;
					serviceHeaderClicked = true;
					v.classList.add("not-active"); v.classList.remove("active");
					v.style.height = window.innerWidth < 426 ? "23px" : "30px";
				});
			});
		})();
		</script>

		<div class="homepage-google-reviews">
			<div class="elfsight-app-67911321-4b72-4209-b157-fc9812eadd3b" data-elfsight-app-lazy></div>
		</div>

		<p class="tiktok-headline">J Blanton Plumbing - Turning Bad Calls to Good Calls</p>

		<div class="home-tiktok">
			<div class="elfsight-app-9f370c11-108b-412b-8529-6b3f093f04a3" data-elfsight-app-lazy></div>
		</div>
	</div>
</div>

<div class="cream">
	<div class="why w81">
		<p class="red-text why-label-mobile">WHY J. BLANTON</p>
		<iframe
			width="560" height="315"
			src="https://www.youtube-nocookie.com/embed/ZDFzUtjBUCk?controls=0&rel=0&fs=0"
			title="YouTube video player" frameborder="0"
			allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
			referrerpolicy="strict-origin-when-cross-origin" allowfullscreen>
		</iframe>
		<div class="why-content">
			<p class="red-text">WHY J. BLANTON</p>
			<?php echo wp_kses_post( $home_whyjb_text_1 ); ?>
			<?php echo wp_kses_post( $home_whyjb_text_2 ); ?>
			<a class="link-button" href="<?php echo esc_url(home_url('/why-j-blanton')); ?>">MEET OUR TEAM</a>
		</div>
	</div>

	<div class="w81">
		<!-- No Drip Club -->
		<div class="no-drip-club">
			<img class="lazy character" data-src="https://d1rplazj5a80fb.cloudfront.net/images/jbcharacter.webp" alt="J. Blanton Character" />
			<div class="no-drip-red"></div>
			<div class="no-drip-labels">
				<p>NO DRIP CLUB</p>
				<p>NO DRIP CLUB</p>
			</div>
			<div class="no-drip-content">
				<?php echo wp_kses_post( $home_ndc_text ); ?>
				<a href="<?php echo esc_url(home_url('/no-drip-club')); ?>">JOIN THE NO DRIP CLUB</a>
			</div>
		</div>

		<!-- Knowledge Hub -->
		<div class="align1 knowledge-hub">
			<p class="red-text">KNOWLEDGE HUB</p>
			<div>
				<p><?php echo esc_html( $home_kb_text ); ?></p>
				<a class="link-button" href="<?php echo esc_url(home_url('/knowledge-hub')); ?>">VIEW ALL ARTICLES</a>
			</div>
		</div>

		<div class="articles">
			<div class="articles-component">
			<?php
			$recent = get_posts(['numberposts'=>3,'post_status'=>'publish','post_type'=>'jb_article','orderby'=>'date','order'=>'DESC']);
			foreach ($recent as $art_post):
				$thumb = get_post_meta($art_post->ID, 'article_image', true) ?: 'https://d1rplazj5a80fb.cloudfront.net/images/hero_image.webp';
			?>
			<div class="article-card">
				<img class="lazy" data-src="<?php echo esc_url($thumb); ?>" alt="<?php echo esc_attr(get_the_title($art_post->ID)); ?>" />
				<div>
					<p class="article-title"><?php echo esc_html(get_the_title($art_post->ID)); ?></p>
					<p><?php echo esc_html(wp_trim_words(get_post_field('post_excerpt',$art_post->ID) ?: wp_strip_all_tags($art_post->post_content), 20)); ?></p>
					<a href="<?php echo esc_url(get_permalink($art_post->ID)); ?>">
						<p>Read more</p>
						<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"/></svg>
					</a>
				</div>
			</div>
			<?php endforeach; wp_reset_postdata(); ?>
			</div>
		</div>
	</div>
</div>

<div class="find-us">
	<div class="find-us-contents w81">
		<div>
			<p class="red-text">FIND US</p>
			<p><?php echo esc_html( $home_findus_text_1 ); ?></p>
			<p><?php echo esc_html( $home_findus_text_2 ); ?></p>
			<div class="involveme_popup link-button"
				data-project="schedule-service-new"
				data-embed-mode="popup"
				data-trigger-event="button"
				data-popup-size="medium"
				data-organization-url="https://jblantonplumbing.involve.me"
			><p>BOOK NOW</p></div>
		</div>
		<div class="elfsight-app-057181ff-104d-43cf-b155-ebff8aadd32c" data-elfsight-app-lazy></div>
		<div class="involveme_popup link-button book-now-map"
			data-project="schedule-service-new"
			data-embed-mode="popup"
			data-trigger-event="button"
			data-popup-size="medium"
			data-organization-url="https://jblantonplumbing.involve.me"
		><p>BOOK NOW</p></div>
	</div>
</div>

<?php get_footer(); ?>
