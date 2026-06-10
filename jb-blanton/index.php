<?php get_header(); ?>

<div class="cream">
	<div class="w81" style="padding: 40px 0;">
		<?php if (have_posts()) : while (have_posts()) : the_post(); ?>
		<div class="article-card" style="margin-bottom:20px;">
			<div class="article-card-content">
				<p class="article-title"><?php the_title(); ?></p>
				<a href="<?php the_permalink(); ?>">Read More</a>
			</div>
		</div>
		<?php endwhile; endif; ?>
	</div>
</div>

<?php get_footer(); ?>
