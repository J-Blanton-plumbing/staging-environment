<?php /* Template Name: Financing */ get_header();
// --- 2026-04-20: ACF hero overrides. Empty fields → original strings. ---
$hero_heading     = get_field( 'hero_heading' )     ?: 'J. BLANTON, LET\'S TALK FINANCING OPTIONS';
$hero_description = get_field( 'hero_description' ) ?: 'Flexible Financing Solutions for Your Plumbing Needs. Don\'t let budget concerns stop you from getting essential repairs. With our easy payment plans and quick approval process, you can get the plumbing service you need today. Call us to learn about our financing options and keep your home running smoothly!';
$hero_image_src   = jb_resolve_hero_image( get_field( 'hero_image_override' ), 'https://d1rplazj5a80fb.cloudfront.net/images/clogged+drain-4.webp' );
?>
<div class="hero">
	<img class="img-s" src="<?php echo esc_url( $hero_image_src ); ?>" alt="Financing Hero" />
	<div class="contents">
		<div class="w">
			<h1><?php echo esc_html( $hero_heading ); ?></h1>
			<p class="hero-desc"><?php echo esc_html( $hero_description ); ?></p>
			<a class="hero-link-button" href="tel:773-724-9272">
				<div><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 10.999h2C22 5.869 18.127 2 12.99 2v2C17.052 4 20 6.943 20 10.999"/><path fill="currentColor" d="M13 8c2.103 0 3 .897 3 3h2c0-3.225-1.775-5-5-5zm3.422 5.443a1 1 0 0 0-1.391.043l-2.393 2.461c-.576-.11-1.734-.471-2.926-1.66c-1.192-1.193-1.553-2.354-1.66-2.926l2.459-2.394a1 1 0 0 0 .043-1.391L6.859 3.513a1 1 0 0 0-1.391-.087l-2.17 1.861a1 1 0 0 0-.29.649c-.015.25-.301 6.172 4.291 10.766C11.305 20.707 16.323 21 17.705 21c.202 0 .326-.006.359-.008a1 1 0 0 0 .648-.291l1.86-2.171a1 1 0 0 0-.086-1.391z"/></svg></div>
				<p>773-724-9272</p>
			</a>
		</div>
		<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/wrench_pattern.webp" alt="" />
	</div>
</div>
<?php get_template_part('template-parts/hero','nav'); ?>
<div class="w-aboutus">
	<div class="pv">
		<div class="w81">
			<div>
				<p class="red-text">WHY CHOOSE OUR OFFERS?</p>
				<p>Discover exclusive savings without compromising on quality. At J. Blanton Plumbing, our offers are designed to give you the best value for expert plumbing services. With over 30 years of trusted experience, fully licensed professionals, and a satisfaction guarantee, you can count on us to deliver exceptional results at a price that fits your budget.</p>
			</div>
			<p class="red-text red-text-mobile">WHY CHOOSE OUR OFFERS?</p>
			<img class="lazy" alt="Preventative" data-src="https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp" />
			<div class="mobile-content">
				<p>Discover exclusive savings without compromising on quality. At J. Blanton Plumbing, our offers are designed to give you the best value for expert plumbing services. With over 30 years of trusted experience, fully licensed professionals, and a satisfaction guarantee, you can count on us to deliver exceptional results at a price that fits your budget.</p>
			</div>
		</div>
	</div>
	<div class="wte lws">
		<div class="w81">
			<p class="red-text red-text-mobile">HOW TO REDEEM OUR OFFERS</p>
			<img class="lazy" alt="City" data-src="https://d1rplazj5a80fb.cloudfront.net/images/image14.webp" />
			<div>
				<p class="red-text">HOW TO REDEEM OUR OFFERS</p>
				<p>Taking advantage of our exclusive deals is simple and hassle-free. Just select the offer that best fits your needs, mention it when scheduling your service, and let our team handle the rest. Whether booking online or over the phone, our friendly team will ensure your discount is applied seamlessly. Start saving today with J. Blanton Plumbing!</p>
			</div>
		</div>
	</div>
	<div class="pv">
		<div class="w81">
			<div>
				<p class="red-text">LIMITED-TIME DEALS</p>
				<p>Don't miss out on our limited-time offers designed to give you the best value on plumbing services. These promotions are available for a short period, so act quickly to secure your savings. From emergency repairs to routine maintenance, take advantage of these deals and let our licensed experts provide you with top-notch service at unbeatable prices.</p>
			</div>
			<p class="red-text red-text-mobile">LIMITED-TIME DEALS</p>
			<img class="lazy" alt="Preventative" data-src="https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp" />
			<div class="mobile-content">
				<p>Don't miss out on our limited-time offers designed to give you the best value on plumbing services. These promotions are available for a short period, so act quickly to secure your savings. From emergency repairs to routine maintenance, take advantage of these deals and let our licensed experts provide you with top-notch service at unbeatable prices.</p>
			</div>
		</div>
	</div>
</div>
<?php get_footer(); ?>
