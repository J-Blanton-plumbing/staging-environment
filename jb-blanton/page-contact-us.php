<?php /* Template Name: Contact Us */ get_header();
// --- 2026-04-20: ACF hero overrides. Empty fields → original strings. ---
$hero_heading     = get_field( 'hero_heading' )     ?: 'CONTACT J. BLANTON PLUMBING';
$hero_description = get_field( 'hero_description' ) ?: 'Ready to make a good call? Our team is available 24/7 for emergencies and during business hours for all other inquiries.';
$hero_image_src   = jb_resolve_hero_image( get_field( 'hero_image_override' ), 'https://d1rplazj5a80fb.cloudfront.net/images/hero_image.webp' );
?>
<div class="hero">
	<img class="img-s" src="<?php echo esc_url( $hero_image_src ); ?>" alt="Contact Us" />
	<h1><?php echo esc_html( $hero_heading ); ?></h1>
	<p class="hero-desc"><?php echo esc_html( $hero_description ); ?></p>
	<a class="hero-link-button" href="tel:773-724-9272"><div><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 15.5c-1.2 0-2.5-.2-3.6-.6h-.3c-.3 0-.5.1-.7.3l-2.2 2.2c-2.8-1.5-5.2-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1c-.3-1.1-.5-2.4-.5-3.6c0-.5-.5-1-1-1H4c-.5 0-1 .5-1 1c0 9.4 7.6 17 17 17c.5 0 1-.5 1-1v-3.5c0-.5-.5-1-1-1"/></svg></div><p>773-724-9272</p></a>
</div>
<?php get_template_part('template-parts/hero','nav'); ?>
<div class="cream"><div class="w81" style="padding:60px 0;">
	<div class="f" style="gap:60px;flex-wrap:wrap;">
		<div style="flex:1;min-width:280px;">
			<p class="red-text">GET IN TOUCH</p>
			<p><strong>Phone:</strong> <a href="tel:773-724-9272">(773) 724-9272</a></p>
			<p style="margin-top:20px;">Available 24/7 for plumbing emergencies. We typically respond to all inquiries within 1 business day.</p>
			<div style="margin-top:30px;">
				<p class="red-text">SCHEDULE A SERVICE</p>
				<div class="link-button involveme_popup" data-params='source=,campaignname=,utm_campaign=,utm_adgroup=,keyword=,network=,device=,medium=,gclid=,msclkid=' data-project="schedule-service-new" data-embed-mode="popup" data-trigger-event="button" data-popup-size="medium" data-organization-url="https://jblantonplumbing.involve.me" style="display:inline-flex;margin-top:10px;"><p>SCHEDULE NOW</p></div>
			</div>
		</div>
		<div style="flex:1;min-width:280px;">
			<p class="red-text">OUR LOCATIONS</p>
			<?php
			$offices = [
				['Northbrook (Corporate)','1945 Techny Road, #11, Northbrook, IL 60062'],
				['Algonquin','2390 Esplanade Dr #200f, Algonquin, IL 60102'],
				['Chicago Ravenswood','5126 N Ravenswood Ave, Chicago, IL 60640'],
				['Arlington Heights','1204 East Central Road, Suite 2, Arlington Heights, IL 60005'],
				['Evanston','1603 Orrington Ave #600-1085, Evanston, IL 60201'],
			];
			foreach($offices as $o): ?>
			<div style="margin-bottom:12px;">
				<strong><?php echo esc_html($o[0]); ?></strong><br/>
				<span><?php echo esc_html($o[1]); ?></span>
			</div>
			<?php endforeach; ?>
			<a href="<?php echo esc_url(home_url('/locations')); ?>" style="color:var(--red);text-decoration:underline;">View all locations →</a>
		</div>
	</div>
	<?php if (have_posts()): while(have_posts()): the_post(); if(trim(get_the_content())): ?>
	<div style="margin-top:40px;"><?php the_content(); ?></div>
	<?php endif; endwhile; endif; ?>
</div></div>
<?php get_footer(); ?>
