use assert_cmd::Command;
use predicates::prelude::*;

#[test]
fn test_default_greeting() {
    let mut cmd = Command::cargo_bin("hello_world").unwrap();
    cmd.assert()
        .success()
        .stdout(predicate::str::contains("Hey, World!"));
}

#[test]
fn test_custom_name() {
    let mut cmd = Command::cargo_bin("hello_world").unwrap();
    cmd.arg("Alice")
        .assert()
        .success()
        .stdout(predicate::str::contains("Hey, Alice!"));
}

#[test]
fn test_formal_style() {
    let mut cmd = Command::cargo_bin("hello_world").unwrap();
    cmd.arg("Bob")
       .arg("--style")
       .arg("formal")
       .assert()
       .success()
       .stdout(predicate::str::contains("Good day, Bob."));
}

#[test]
fn test_enthusiastic_style() {
    let mut cmd = Command::cargo_bin("hello_world").unwrap();
    cmd.arg("Charlie")
       .arg("--style")
       .arg("enthusiastic")
       .assert()
       .success()
       .stdout(predicate::str::contains("HELLO CHARLIE!!!"));
}

#[test]
fn test_short_style_flag() {
    let mut cmd = Command::cargo_bin("hello_world").unwrap();
    cmd.arg("David")
       .arg("-s")
       .arg("formal")
       .assert()
       .success()
       .stdout(predicate::str::contains("Good day, David."));
}
