<?php
/**
 * Plugin Name: Hydrogen Calendar Redesign
 * Description: Site-level visual redesign for Hydrogen Calendar Embeds.
 */

add_action('hycal_enqueue_scripts', function ($hycalSettings) {
    $base = content_url('mu-plugins/hycal-redesign');
    $dir  = WPMU_PLUGIN_DIR . '/hycal-redesign';

    wp_enqueue_style(
        'hycal-redesign-style',
        $base . '/style.css',
        ['hycal_css'],
        filemtime($dir . '/style.css')
    );

    wp_enqueue_script(
        'hycal-redesign-script',
        $base . '/script.js',
        ['hycal_hooks', 'hycal_loader'],
        filemtime($dir . '/script.js'),
        true
    );
});
