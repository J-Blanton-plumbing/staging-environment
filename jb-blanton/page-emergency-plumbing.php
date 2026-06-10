<?php /* Template Name: Emergency Plumbing */ get_header();
// --- 2026-04-20: ACF overrides. Empty fields → original strings. ---
$hero_heading     = get_field( 'hero_heading' )     ?: 'J. BLANTON, WHAT\'S YOUR EMERGENCY?';
$hero_subheading  = get_field( 'hero_subheading' )  ?: '';
$hero_description = get_field( 'hero_description' ) ?: 'We provide 24/7 service for plumbing emergencies. If you\'re facing an urgent issue like a burst pipe or clogged drain, don\'t hesitate—pick up the phone and call us! We\'ll be there to turn an unexpected problem into a Good Call.';
$hero_image_src   = jb_resolve_hero_image( get_field( 'hero_image_override' ), 'https://d1rplazj5a80fb.cloudfront.net/images/img_emergency-plumbing.webp' );

$ep_ready_heading  = get_field( 'ep_ready_heading' )  ?: 'PLUMBERS AT THE READY';
$ep_ready_text     = get_field( 'ep_ready_text' )     ?: '<p>In an emergency, every second counts. J. Blanton isn\'t just one plumber—we\'re a full team of professionals ready to act fast. Whatever the problem, we\'ll have the right person at your door, ready to make the right call.</p>';
$ep_cover_heading  = get_field( 'ep_cover_heading' )  ?: 'WE\'RE ALMOST EVERYWHERE';
$ep_cover_text     = get_field( 'ep_cover_text' )     ?: '<p>With more plumbers and more trucks at our disposal, we can cover more ground and reach your home quickly. Use our map to see if we cover your location, or give us a call for immediate assistance.</p>';
$ep_ndccta_heading = get_field( 'ep_ndccta_heading' ) ?: 'WE HATE EMERGENCIES TOO';
$ep_ndccta_text    = get_field( 'ep_ndccta_text' )    ?: '<p>That\'s why we created the No Drip Club, a complete peace of mind solution that helps you save on unexpected expenses.</p>';
$ep_final_heading  = get_field( 'ep_final_heading' )  ?: 'TURN A BAD SITUATION INTO A GOOD CALL';
$ep_final_text     = get_field( 'ep_final_text' )     ?: '<p>What are you waiting for? The sooner you call, the sooner we\'ll be there.</p>';
?>
<div class="hero">
	<img class="img-s" src="<?php echo esc_url( $hero_image_src ); ?>" alt="Emergency Plumbing" />
	<div class="contents">
		<div class="w">
			<h1><?php echo esc_html( $hero_heading ); ?></h1>
			<p class="sub-label"><?php echo esc_html( $hero_subheading ); ?></p>
			<p class="hero-desc"><?php echo esc_html( $hero_description ); ?></p>
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
<?php get_template_part('template-parts/hero','nav'); ?>
<div class="cream"><div class="w81 emergecy-plumbing">
	<div class="f">
		<div>
			<p class="red-text"><?php echo esc_html( $ep_ready_heading ); ?></p>
			<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/emergency-h2.webp" alt="Emergency Plumbing" />
			<?php echo wp_kses_post( $ep_ready_text ); ?>
		</div>
		<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/emergency-h2.webp" alt="Emergency Plumbing" />
	</div>
	<div class="ep-card">
		<img class="ndc lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/no-drip-club.webp" alt="NDC" />
		<div>
			<img class="lazy char" data-src="https://d1rplazj5a80fb.cloudfront.net/images/jbcharacter.webp" alt="Character" />
			<div class="a"><div class="l"></div><div class="r">
				<p class="label">EMERGENCIES WE FIX</p>
				<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp" alt="Plumbing" />
				<?php $svgcheck = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M21.546 5.111a1.5 1.5 0 0 1 0 2.121L10.303 18.475a1.6 1.6 0 0 1-2.263 0L2.454 12.89a1.5 1.5 0 1 1 2.121-2.121l4.596 4.596L19.424 5.111a1.5 1.5 0 0 1 2.122 0"/></svg>'; $items = ['Kitchen plumbing repair','Bathroom plumbing repair','Sewer line repair','Water leak repair','Water heater repair']; foreach($items as $item): echo '<div class="service"><div>'.$svgcheck.'</div><p>'.esc_html($item).'</p></div>'; endforeach; ?>
				<a class="link-button" href="tel:773-724-9272">MAKE A GOOD CALL</a>
			</div></div>
		</div>
	</div>
	<div class="ep-map">
		<div class="ep-contents"><div class="map2"><div class="elfsight-app-9da0734e-a27e-4557-85a0-da9b69617829" data-elfsight-app-lazy></div></div>
			<p class="red-text"><?php echo esc_html( $ep_cover_heading ); ?></p>
			<?php echo wp_kses_post( $ep_cover_text ); ?>
		</div>
		<div class="map1"><div class="elfsight-app-9da0734e-a27e-4557-85a0-da9b69617829" data-elfsight-app-lazy></div></div>
	</div>
	<div class="ep-gr"><div class="elfsight-app-67911321-4b72-4209-b157-fc9812eadd3b" data-elfsight-app-lazy></div></div>
	<p class="ep-tiktok-headline">J Blanton Plumbing - Turning Bad Calls to Good Calls</p>
	<div class="ep-tiktok"><div class="elfsight-app-9f370c11-108b-412b-8529-6b3f093f04a3" data-elfsight-app-lazy></div></div>
	<div class="f2"><div>
		<p class="red-text"><?php echo esc_html( $ep_ndccta_heading ); ?></p>
		<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp" alt="Plumbing" />
		<?php echo wp_kses_post( $ep_ndccta_text ); ?>
		<a class="link-button" href="<?php echo esc_url(home_url('/no-drip-club')); ?>">JOIN NOW</a>
	</div>
	<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp" alt="Plumbing" /></div>
	<div class="f3"><img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/plumbing-hero.jpg" alt="Plumbing" />
		<div>
			<p class="red-text"><?php echo esc_html( $ep_final_heading ); ?></p>
			<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/plumbing-hero.jpg" alt="Plumbing" />
			<?php echo wp_kses_post( $ep_final_text ); ?>
			<a class="link-button button1" href="tel:773-724-9272">MAKE A GOOD CALL</a>
		</div>
	</div>
</div></div>
<?php get_footer(); ?>
