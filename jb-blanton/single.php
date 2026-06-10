<?php get_header(); ?>

<?php if (have_posts()) : while (have_posts()) : the_post();
	$_art_img = get_post_meta( get_the_ID(), 'article_image', true );
	$_cf      = 'https://d1rplazj5a80fb.cloudfront.net/images/';
?>

<div class="article-page-hero page-style">
	<?php if ( $_art_img ) : ?>
	<img class="article-page-image lazy" data-src="<?php echo esc_url( $_art_img ); ?>" alt="<?php echo esc_attr( get_the_title() ); ?>" />
	<?php endif; ?>
	<div class="contents">
		<div class="w">
			<h1><?php the_title(); ?></h1>
			<p class="tagline">Everything you need to know, directly from the experts.</p>
			<div class="involveme_popup" data-params='source=,campaignname=,utm_campaign=,utm_adgroup=,keyword=,network=,device=,medium=,gclid=,msclkid=' data-project="schedule-service-new" data-embed-mode="popup" data-trigger-event="button" data-popup-size="medium" data-organization-url="https://jblantonplumbing.involve.me"><p>SCHEDULE NOW</p></div>
		</div>
		<img class="lazy" data-src="<?php echo esc_url( $_cf . 'wrench_pattern.webp' ); ?>" alt="" />
	</div>
</div>

<?php get_template_part( 'template-parts/hero', 'nav' ); ?>

<div class="article-page-content">
	<?php the_content(); ?>
</div>

<div class="article-footer-cta">
	<h2>NEED AN EXPERT?</h2>
	<h3>MAKE A GOOD CALL.</h3>
	<p>We're here to help with all your plumbing needs</p>
	<div class="involveme_popup" data-params='source=,campaignname=,utm_campaign=,utm_adgroup=,keyword=,network=,device=,medium=,gclid=,msclkid=' data-project="schedule-service-new" data-embed-mode="popup" data-trigger-event="button" data-popup-size="medium" data-organization-url="https://jblantonplumbing.involve.me"><p>SCHEDULE NOW</p></div>
</div>

<?php endwhile; endif; ?>

<?php get_footer(); ?>
