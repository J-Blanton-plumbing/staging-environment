<?php /* Template Name: Offers */ get_header();
// --- 2026-04-20: ACF hero overrides. Empty fields → original strings. ---
$hero_heading     = get_field( 'hero_heading' )     ?: 'EXCLUSIVE PLUMBING OFFERS';
$hero_description = get_field( 'hero_description' ) ?: 'Discover exclusive savings without compromising on quality. At J. Blanton Plumbing, our offers are designed to give you the best value for expert plumbing services.';
$hero_image_src   = jb_resolve_hero_image( get_field( 'hero_image_override' ), 'https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp' );
?>
<div class="hero">
	<img class="img-s" src="<?php echo esc_url( $hero_image_src ); ?>" alt="Special Offers" />
	<h1><?php echo esc_html( $hero_heading ); ?></h1>
	<p class="hero-desc"><?php echo esc_html( $hero_description ); ?></p>
	<a class="hero-link-button" href="tel:773-724-9272"><div><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 15.5c-1.2 0-2.5-.2-3.6-.6h-.3c-.3 0-.5.1-.7.3l-2.2 2.2c-2.8-1.5-5.2-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1c-.3-1.1-.5-2.4-.5-3.6c0-.5-.5-1-1-1H4c-.5 0-1 .5-1 1c0 9.4 7.6 17 17 17c.5 0 1-.5 1-1v-3.5c0-.5-.5-1-1-1"/></svg></div><p>773-724-9272</p></a>
</div>
<?php get_template_part('template-parts/hero','nav'); ?>
<div class="w-aboutus">
	<div class="pv"><div class="w81">
		<div>
			<p class="red-text">WHY CHOOSE OUR OFFERS?</p>
			<p>Discover exclusive savings without compromising on quality. At J. Blanton Plumbing, our offers are designed to give you the best value for expert plumbing services. With over 30 years of trusted experience, fully licensed professionals, and a satisfaction guarantee, you can count on us.</p>
		</div>
		<p class="red-text red-text-mobile">WHY CHOOSE OUR OFFERS?</p>
		<img class="lazy" alt="Preventative" data-src="https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp" />
	</div></div>
	<div class="wte lws"><div class="w81">
		<p class="red-text red-text-mobile">HOW TO REDEEM OUR OFFERS</p>
		<img class="lazy" alt="City" data-src="https://d1rplazj5a80fb.cloudfront.net/images/image14.webp" />
		<div>
			<p class="red-text">HOW TO REDEEM OUR OFFERS</p>
			<p>Taking advantage of our exclusive deals is simple and hassle-free. Just select the offer that best fits your needs, mention it when scheduling your service, and let our team handle the rest.</p>
		</div>
	</div></div>
	<div class="pv"><div class="w81">
		<div>
			<p class="red-text">LIMITED-TIME DEALS</p>
			<p>Don't miss out on our limited-time offers designed to give you the best value on plumbing services. These promotions are available for a short period, so act quickly to secure your savings.</p>
		</div>
		<p class="red-text red-text-mobile">LIMITED-TIME DEALS</p>
		<img class="lazy" alt="Preventative" data-src="https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp" />
	</div></div>
	<?php if (have_posts()): while(have_posts()): the_post(); ?>
	<div class="w81" style="padding:40px 0;"><?php the_content(); ?></div>
	<?php endwhile; endif; ?>
</div>
<?php get_footer(); ?>
