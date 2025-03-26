use clap::{Parser, ValueEnum};
use hello_world::{create_greeting, GreetingStyle};
use std::process;

/// Enum representing command-line style options
#[derive(Copy, Clone, Debug, PartialEq, Eq, ValueEnum)]
enum Style {
    Formal,
    Casual,
    Enthusiastic,
}

impl From<Style> for GreetingStyle {
    fn from(style: Style) -> Self {
        match style {
            Style::Formal => GreetingStyle::Formal,
            Style::Casual => GreetingStyle::Casual, 
            Style::Enthusiastic => GreetingStyle::Enthusiastic,
        }
    }
}

/// A simple hello world application with customizable greetings
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Name to greet
    #[arg(default_value = "World")]
    name: String,

    /// Greeting style to use
    #[arg(value_enum, short, long, default_value_t = Style::Casual)]
    style: Style,
}

fn main() {
    // Parse command-line arguments
    let args = Args::parse();
    
    // Convert CLI style enum to library style enum
    let greeting_style: GreetingStyle = args.style.into();
    
    // Generate the greeting
    let greeting = create_greeting(&args.name, greeting_style);
    
    // Print the greeting
    println!("{}", greeting);
    
    // Exit successfully
    process::exit(0);
}
