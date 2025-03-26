//! # Hello World Library
//! 
//! This library provides functionality for generating customized greeting messages.

/// Greeting styles available in the library
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum GreetingStyle {
    /// Formal greeting style (e.g., "Good day, Name")
    Formal,
    /// Casual greeting style (e.g., "Hey, Name!")
    Casual,
    /// Enthusiastic greeting style (e.g., "HELLO NAME!!!")
    Enthusiastic,
}

/// Creates a greeting message for the given name using the specified style.
///
/// # Arguments
///
/// * `name` - The name to include in the greeting
/// * `style` - The style of greeting to generate
///
/// # Returns
///
/// A String containing the formatted greeting
///
/// # Examples
///
/// ```
/// use hello_world::{create_greeting, GreetingStyle};
///
/// let greeting = create_greeting("World", GreetingStyle::Casual);
/// assert_eq!(greeting, "Hey, World!");
/// ```
pub fn create_greeting(name: &str, style: GreetingStyle) -> String {
    match style {
        GreetingStyle::Formal => format!("Good day, {}.", name),
        GreetingStyle::Casual => format!("Hey, {}!", name),
        GreetingStyle::Enthusiastic => format!("HELLO {}!!!", name.to_uppercase()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_formal_greeting() {
        let result = create_greeting("World", GreetingStyle::Formal);
        assert_eq!(result, "Good day, World.");
    }

    #[test]
    fn test_casual_greeting() {
        let result = create_greeting("World", GreetingStyle::Casual);
        assert_eq!(result, "Hey, World!");
    }

    #[test]
    fn test_enthusiastic_greeting() {
        let result = create_greeting("World", GreetingStyle::Enthusiastic);
        assert_eq!(result, "HELLO WORLD!!!");
    }
}
