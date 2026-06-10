<?php /* Template Name: Locations */ get_header();
// --- 2026-04-20: ACF hero overrides. Empty fields → original strings. ---
// NOTE: hero here uses a map widget (not a static image), so hero_image_override is not wired.
$hero_heading     = get_field( 'hero_heading' )     ?: 'CHICAGO & SUBURBS TOP-RATED PLUMBING COMPANY';
$hero_subheading  = get_field( 'hero_subheading' )  ?: '';
$hero_description = get_field( 'hero_description' ) ?: 'For over 30 years, J. Blanton Plumbing has been the trusted choice for plumbing services in Chicago and the surrounding suburbs. From burst pipes to kitchen floods, no matter where you are, our team is ready 24/7 to restore your home\'s comfort.';
?>
<div class="hero">
	<div class="hero-map">
		<div class="elfsight-app-9da0734e-a27e-4557-85a0-da9b69617829" data-elfsight-app-lazy></div>
	</div>
	<div class="contents">
		<div class="w">
			<h1><?php echo esc_html( $hero_heading ); ?></h1>
			<p class="sub-label"><?php echo esc_html( $hero_subheading ); ?></p>
			<p class="hero-desc"><?php echo esc_html( $hero_description ); ?></p>
			<div class="involveme_popup" data-params='source=,campaignname=,utm_campaign=,utm_adgroup=,keyword=,network=,device=,medium=,gclid=,msclkid=' data-project="schedule-service-new" data-embed-mode="popup" data-trigger-event="button" data-popup-size="medium" data-organization-url="https://jblantonplumbing.involve.me"><p>SCHEDULE A SERVICE</p></div>
		</div>
		<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/wrench_pattern.webp" alt="" />
	</div>
</div>
<?php get_template_part('template-parts/hero','nav'); ?>
<div class="ls-cream">
	<div class="ls-pv">
		<div class="w81">
			<div>
				<p class="red-text">Your Trusted Plumbing Experts Serving Chicago and Suburbs</p>
				<p>At J. Blanton Plumbing, we've proudly serving Chicago and its surrounding suburbs for over 30 years. Our team of experienced and certified plumbers is committed to delivering high-quality service that our customers can rely on-day or night. From residential repairs to large-scale plumbing projects, we handle it all with professionalism, efficiency, and a dedication to customer satisfaction.</p>
				<p>Whether you're in the heart of the city or in suburbs like Northbrook, Arlington Heights, or Evanston, we're here to address all your plumbing needs. Our services include everything from emergency repairs and water heater installations to drain cleaning and sump pump maintenance. No matter the job, you can count on our expertise and fast response times to your home or business back to normal.</p>
				<p>When plumbing problems arise, don't settle for less-Make a Good Call with J. Blanton Plumbing. We're proud to be a part of the communities we serve and are dedicated to maintanining your trust through honest communication, transparent pricing, and guaranteed work.</p>
			</div>
			<img class="lazy" alt="Preventative" data-src="https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp" />
			<p class="red-text red-text-mobile">MAKING GOOD CALLS ACROSS CHICAGOLAND</p>
		</div>
	</div>

	<div class="map">
		<div class="map-cities">
			<p class="red-text">OUR SERVICE CENTERS</p>
			<div class="r">
				<div>
					<a href="<?php echo esc_url(home_url('/northbrook')); ?>">Northbrook, IL</a>
					<a href="<?php echo esc_url(home_url('/algonquin')); ?>">Algonquin, IL</a>
					<a href="<?php echo esc_url(home_url('/arlington-heights')); ?>">Arlington Heights, IL</a>
					<a href="<?php echo esc_url(home_url('/chicago-lincoln-park')); ?>">Chicago - Lincoln Park</a>
				</div>
				<div>
					<a href="<?php echo esc_url(home_url('/chicago-ravenswood')); ?>">Chicago - Ravenswood</a>
					<a href="<?php echo esc_url(home_url('/elgin')); ?>">Elgin, IL</a>
					<a href="<?php echo esc_url(home_url('/evanston')); ?>">Evanston, IL</a>
					<a href="<?php echo esc_url(home_url('/geneva')); ?>">Geneva, IL</a>
					<a href="<?php echo esc_url(home_url('/joliet')); ?>">Joliet, IL</a>
				</div>
				<div>
					<a href="<?php echo esc_url(home_url('/hinsdale')); ?>">Hinsdale, IL</a>
					<a href="<?php echo esc_url(home_url('/mchenry')); ?>">McHenry, IL</a>
					<a href="<?php echo esc_url(home_url('/naperville')); ?>">Naperville, IL</a>
					<a href="<?php echo esc_url(home_url('/skokie')); ?>">Skokie</a>
					<a href="<?php echo esc_url(home_url('/elmhurst')); ?>">Elmhurst, IL</a>
				</div>
			</div>
		</div>
	</div>

	<div class="ls-man">
		<div class="w81">
			<p class="red-text red-text-mobile">Serving Chicagoland with Trusted Plumbing Solutions</p>
			<img class="lazy" alt="Preventative" data-src="https://d1rplazj5a80fb.cloudfront.net/images/Flood+Control+copy.webp" />
			<div>
				<p class="red-text">Serving Chicagoland with Trusted Plumbing Solutions</p>
				<p>For over 30 years, J. Blanton Plumbing has proudly served Chicago and its surrounding suburbs, including Northbrook, Arlington Heights, Naperville, Elgin, and more. With convenient locations throughout the region, we're ready to provide fast, reliable plumbing services whenever you need us. Wherever you are, Make a Good Call with J. Blanton Plumbing and experience the difference.</p>
			</div>
		</div>
	</div>

	<div class="w81">
		<?php
		// City labels and l-cities grid
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
		?>
		<div class="city-labels">
			<p>Proudly Serving the Greater Chicagoland Area for 30+ Years</p>
			<p>Some areas we serve, but are not limited to, include:</p>
		</div>
		<div class="l-cities">
			<?php if ( ! empty( $city_pages ) ) :
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
			<?php endforeach; endif; ?>
		</div>
	</div>
</div>
<?php get_footer(); ?>
